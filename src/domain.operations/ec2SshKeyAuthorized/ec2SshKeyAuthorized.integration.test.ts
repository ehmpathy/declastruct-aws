import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import { getError } from 'helpful-errors';
import * as os from 'os';
import * as path from 'path';
import type { ContextLogTrail } from 'sdk-logs';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';
import { promisify } from 'util';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';
import { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';

import { getOneEc2SshKeyAuthorized } from './getOneEc2SshKeyAuthorized';
import { setEc2SshKeyAuthorized } from './setEc2SshKeyAuthorized';

const execFileAsync = promisify(execFile);

/**
 * .what = counts how many times the exact public key line appears in the login
 *         user's authorized_keys on the box (via SSM)
 * .why = proves the durable append actually landed the key on disk and that a
 *        repeat authorize does not duplicate the line
 */
const countAuthorizedKeyLines = async (
  input: { instanceId: string; publicKey: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<number> => {
  const publicKeyBase64 = Buffer.from(input.publicKey).toString('base64');
  const command = [
    'HOME_DIR=$(getent passwd "ec2-user" | cut -d: -f6)',
    `KEY=$(echo "${publicKeyBase64}" | base64 -d)`,
    'grep -cF "$KEY" "$HOME_DIR/.ssh/authorized_keys" || true',
  ].join('\n');
  const result = await execSsmCommand(
    {
      instance: { id: input.instanceId },
      commands: [command],
      timeoutSeconds: 60,
    },
    context,
  );
  return Number.parseInt(result.stdout.trim() || '0', 10);
};

/**
 * .what = integration tests for the SSH key authorization orchestrators
 * .why = proves setEc2SshKeyAuthorized DURABLY appends the key into authorized_keys
 *        on the box (survives stop/start), stays idempotent, and round-trips through
 *        the SSM Parameter Store track layer via get
 * .note
 *   - uses the declared acceptance instance; the SSM append needs it active
 *   - starts the instance for the run, stops it after (cost control)
 *   - a stable comment keeps the SSM parameter idempotent across runs
 */
describe('ec2SshKeyAuthorized', () => {
  jest.setTimeout(600_000); // 10 min — start/stop instance + waiters + ssm

  // gate the heavyweight real-infra flow out of CI.
  // .why = the scene resumes the acceptance instance + NAT (300s waiters) and
  //        drives live SSM SendCommand + EC2 Instance Connect. in CI this is both
  //        slow and depends on the demo OIDC role's ssm:SendCommand /
  //        ec2-instance-connect:SendSSHPublicKey grants (declared in
  //        resources.common.ts but only applied to the SSO demo-agent used
  //        locally). runIf (not .skip) is the blessed gate per
  //        rule.forbid.skipped-tests — when every nested test skips, jest also
  //        skips the describe's beforeAll/afterAll, so no instance is ever
  //        resumed in CI.
  const givenRealInfra = given.runIf(!process.env.CI);

  const instanceExid = 'declastruct-acceptance-instance';
  const natExid = 'declastruct-acceptance-nat';
  const comment = 'isolated-integration-test';

  // scene: ensure the NAT + acceptance instance are active and mint a real keypair
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // look up the declared acceptance instance
    const instance = await getEc2Instance(
      { by: { unique: { exid: instanceExid } } },
      context,
    );
    if (!instance)
      throw new Error(
        'acceptance instance not found — run declastruct apply first',
      );

    // start the NAT first — the acceptance instance has no public IP, so its SSM
    // agent can only reach the SSM endpoints via the NAT's egress route. without an
    // active NAT the agent never registers and SendCommand fails InvalidInstanceId.
    const nat = await getEc2Instance(
      { by: { unique: { exid: natExid } } },
      context,
    );
    if (!nat)
      throw new Error(
        'acceptance NAT instance not found — run declastruct apply first',
      );
    await setEc2InstanceSession(
      {
        session: DeclaredAwsEc2InstanceSession.as({
          instance: { id: nat.id },
          status: 'active',
        }),
      },
      context,
    );

    // start the target instance (the durable SSM append needs it active + reachable)
    await setEc2InstanceSession(
      {
        session: DeclaredAwsEc2InstanceSession.as({
          instance: { id: instance.id },
          status: 'active',
        }),
      },
      context,
    );

    // mint a real ed25519 public key
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'declastruct-sshkey-'));
    const keyPath = path.join(dir, 'id_ed25519');
    await execFileAsync('ssh-keygen', [
      '-t',
      'ed25519',
      '-N',
      '',
      '-C',
      comment,
      '-f',
      keyPath,
    ]);
    const publicKey = (await fs.readFile(`${keyPath}.pub`, 'utf-8')).trim();

    return { context, instance, publicKey, dir };
  });

  // cleanup: stop the instance (cost) and remove the temp keypair dir
  afterAll(async () => {
    const context = await getSampleAwsApiContext();
    const instance = await getEc2Instance(
      { by: { unique: { exid: instanceExid } } },
      context,
    );
    if (instance)
      await setEc2InstanceSession(
        {
          session: DeclaredAwsEc2InstanceSession.as({
            instance: { id: instance.id },
            status: 'stopped',
          }),
        },
        context,
      );
    await fs.rm(scene.dir, { recursive: true, force: true });
  });

  givenRealInfra(
    '[case1] setEc2SshKeyAuthorized durably appends the key',
    () => {
      when('[t0] a real key is authorized', () => {
        // authorize once, share the result across the assertions below
        const authorized = useBeforeAll(async () => {
          const { context, publicKey } = scene;
          return setEc2SshKeyAuthorized(
            DeclaredAwsEc2SshKeyAuthorized.as({
              instance: { exid: instanceExid },
              publicKey,
              comment,
              user: 'ec2-user',
            }),
            context,
          );
        });

        then('it records the authorization (get track layer)', () => {
          expect(authorized.instance.exid).toBe(instanceExid);
          expect(authorized.publicKey).toBe(scene.publicKey);
          expect(authorized.comment).toBe(comment);
          expect(authorized.fingerprint).toBeDefined();
          expect(authorized.authorizedAt).toBeDefined();
        });

        then('the key line is present on disk in authorized_keys', async () => {
          const { context, instance, publicKey } = scene;
          const count = await countAuthorizedKeyLines(
            { instanceId: instance.id, publicKey },
            context,
          );
          expect(count).toBe(1);
        });
      });

      when('[t1] the same key is authorized again', () => {
        then('the append is idempotent — still exactly one line', async () => {
          const { context, instance, publicKey } = scene;
          await setEc2SshKeyAuthorized(
            DeclaredAwsEc2SshKeyAuthorized.as({
              instance: { exid: instanceExid },
              publicKey,
              comment,
              user: 'ec2-user',
            }),
            context,
          );
          const count = await countAuthorizedKeyLines(
            { instanceId: instance.id, publicKey },
            context,
          );
          expect(count).toBe(1);
        });
      });
    },
  );

  givenRealInfra(
    '[case2] the authorization is durable across a stop/start',
    () => {
      when('[t0] the instance is stopped and started again', () => {
        then(
          'the key line survives on disk without a re-authorize',
          async () => {
            const { context, instance, publicKey } = scene;

            // stop then start — proves the key lives on the EBS disk, not in memory
            await setEc2InstanceSession(
              {
                session: DeclaredAwsEc2InstanceSession.as({
                  instance: { id: instance.id },
                  status: 'stopped',
                }),
              },
              context,
            );
            await setEc2InstanceSession(
              {
                session: DeclaredAwsEc2InstanceSession.as({
                  instance: { id: instance.id },
                  status: 'active',
                }),
              },
              context,
            );

            // verify WITHOUT a second setEc2SshKeyAuthorized call
            const count = await countAuthorizedKeyLines(
              { instanceId: instance.id, publicKey },
              context,
            );
            expect(count).toBe(1);
          },
        );
      });
    },
  );

  givenRealInfra('[case3] getOneEc2SshKeyAuthorized', () => {
    when('[t0] the key exists', () => {
      then('it reads the tracked authorization from SSM', async () => {
        const { context, publicKey } = scene;
        const result = await getOneEc2SshKeyAuthorized(
          { by: { unique: { instance: { exid: instanceExid }, comment } } },
          context,
        );

        expect(result).not.toBeNull();
        expect(result!.instance.exid).toBe(instanceExid);
        expect(result!.publicKey).toBe(publicKey);
        expect(result!.comment).toBe(comment);
        expect(result!.fingerprint).toBeDefined();
        expect(result!.authorizedAt).toBeDefined();
      });
    });

    when('[t1] the key does not exist', () => {
      then('it returns null', async () => {
        const { context } = scene;
        const result = await getOneEc2SshKeyAuthorized(
          {
            by: {
              unique: {
                instance: { exid: instanceExid },
                comment: `absent-${genTestUuid().slice(0, 8)}`,
              },
            },
          },
          context,
        );
        expect(result).toBeNull();
      });
    });
  });

  givenRealInfra('[case4] setEc2SshKeyAuthorized on an absent instance', () => {
    when('[t0] the instance cannot be found', () => {
      then('it fails fast with a BadRequestError', async () => {
        const { context, publicKey } = scene;
        const error = await getError(
          setEc2SshKeyAuthorized(
            DeclaredAwsEc2SshKeyAuthorized.as({
              instance: { exid: `nonexistent-${genTestUuid().slice(0, 8)}` },
              publicKey,
              comment,
              user: 'ec2-user',
            }),
            context,
          ),
        );
        expect(error.message).toContain('instance not found');
      });
    });
  });
});
