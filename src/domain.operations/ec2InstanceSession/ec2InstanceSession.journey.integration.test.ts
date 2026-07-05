import {
  DescribeInstancesCommand,
  EC2Client,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import { BadRequestError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { setEc2Instance } from '@src/domain.operations/ec2Instance/setEc2Instance';
import { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';

import { getEc2InstanceSession } from './getEc2InstanceSession';
import { setEc2InstanceSession } from './setEc2InstanceSession';

/**
 * .what = journey test for EC2 instance session lifecycle
 * .why = validates instance state transitions (active/stopped/hibernated)
 * .note
 *   - requires VPC infrastructure (subnet, security group)
 *   - requires valid launch template with hibernation support
 *   - creates real EC2 instances which incur charges
 *   - state transitions take time (waiters have 300s timeout)
 */
describe('ec2InstanceSession.journey', () => {
  // track instance IDs for cleanup
  const instanceIds: string[] = [];

  // cleanup BEFORE: terminate orphans from prior crashed runs
  // .why = if a test run crashes mid-execution, afterAll never runs,
  //        which leaves orphaned instances that consume vCPU quota
  beforeAll(async () => {
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // find orphaned test instances by purpose tag
    // note: 'running' and 'stopped' are AWS API state names
    const orphans = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: 'tag:purpose', Values: ['session-test'] },
          { Name: 'instance-state-name', Values: ['running', 'stopped'] },
        ],
      }),
    );

    const orphanIds =
      orphans.Reservations?.flatMap(
        (r) => r.Instances?.map((i) => i.InstanceId).filter(Boolean) ?? [],
      ) ?? [];

    if (orphanIds.length > 0) {
      await ec2.send(
        new TerminateInstancesCommand({ InstanceIds: orphanIds as string[] }),
      );
    }
  });

  // cleanup AFTER: terminate instances created in this run
  afterAll(async () => {
    if (instanceIds.length === 0) return;
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
  });

  // gate the heavyweight real-infra flow out of CI.
  // .why = each case boots a fresh EC2 instance and drives full stop/start/
  //        hibernate transitions (300s waiters) plus SSM agent registration.
  //        in CI this both exceeds vCPU quota and adds several minutes of flake.
  //        runIf (not .skip) is the blessed gate per rule.forbid.skipped-tests —
  //        when every nested test skips, jest also skips the describe's
  //        beforeAll/afterAll, so no instance is ever launched in CI.
  const givenRealInfra = given.runIf(!process.env.CI);

  // generate unique exid for this test run
  const testExid = `declastruct-test-session-${genTestUuid().slice(0, 8)}`;

  // scene setup — create instance once for all tests
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // create test instance with hibernation-capable template
    const instance = await setEc2Instance(
      {
        findsert: DeclaredAwsEc2Instance.as({
          exid: testExid,
          template: { exid: 'declastruct-acceptance-template' }, // template with hibernation enabled
          network: {
            subnet: { exid: 'declastruct-acceptance-subnet-private-1a' }, // ref to acceptance subnet
            security: { groups: [{ exid: 'declastruct-acceptance-sg' }] }, // ref to acceptance SG
            interface: { publicIpEnabled: false, sourceDestChecked: true },
          },
          tags: { managedBy: 'declastruct', purpose: 'session-test' },
        }),
      },
      context,
    );

    // track for cleanup
    if (!instanceIds.includes(instance.id)) instanceIds.push(instance.id);

    return { context, instance };
  });

  givenRealInfra('[case1] session lifecycle', () => {
    when('[t0] getEc2InstanceSession on new instance', () => {
      then('returns valid session with status', async () => {
        const { context, instance } = scene;
        const session = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );

        expect(session).not.toBeNull();
        expect(session?.status).toBeDefined();
        expect(['active', 'stopped', 'hibernated', 'terminated']).toContain(
          session?.status,
        );
      });
    });

    when('[t1] setEc2InstanceSession to stopped', () => {
      then('instance transitions to stopped', async () => {
        const { context, instance } = scene;

        // transition to stopped
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'stopped',
            }),
          },
          context,
        );

        expect(session.status).toBe('stopped');

        // verify via get
        const sessionVerify = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );
        expect(sessionVerify?.status).toBe('stopped');
      });
    });

    when('[t2] setEc2InstanceSession to active from stopped', () => {
      then('instance transitions to active', async () => {
        const { context, instance } = scene;

        // transition to active
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        expect(session.status).toBe('active');

        // verify via get
        const sessionVerify = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );
        expect(sessionVerify?.status).toBe('active');
      });
    });

    when('[t3] setEc2InstanceSession to same status', () => {
      then('is idempotent (no state change)', async () => {
        const { context, instance } = scene;

        // get current status
        const sessionBefore = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );
        expect(sessionBefore).not.toBeNull();

        // set to same status — should be fast (no AWS call)
        const startTime = Date.now();
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: sessionBefore!.status,
            }),
          },
          context,
        );
        const elapsedMs = Date.now() - startTime;

        expect(session.status).toBe(sessionBefore!.status);
        // idempotent call should be fast (no waiter)
        expect(elapsedMs).toBeLessThan(5000);
      });
    });
  });

  givenRealInfra('[case2] hibernation lifecycle', () => {
    when('[t0] setEc2InstanceSession to hibernated', () => {
      then('instance transitions to hibernated', async () => {
        const { context, instance } = scene;

        // ensure instance is active first
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        // transition to hibernated
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'hibernated',
            }),
          },
          context,
        );

        expect(session.status).toBe('hibernated');

        // verify via get
        const sessionVerify = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );
        expect(sessionVerify?.status).toBe('hibernated');
      });
    });

    when('[t1] setEc2InstanceSession to active from hibernated', () => {
      then('instance resumes from hibernation', async () => {
        const { context, instance } = scene;

        // ensure hibernated
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'hibernated',
            }),
          },
          context,
        );

        // resume to active
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        expect(session.status).toBe('active');

        // verify via get
        const sessionVerify = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );
        expect(sessionVerify?.status).toBe('active');
      });
    });
  });

  givenRealInfra('[case3] boundary cases', () => {
    when('[t0] getEc2InstanceSession for nonexistent instance by id', () => {
      then('returns null', async () => {
        const { context } = scene;
        const session = await getEc2InstanceSession(
          { by: { instance: { id: 'i-nonexistent12345' } } },
          context,
        );

        expect(session).toBeNull();
      });
    });

    when('[t1] getEc2InstanceSession for nonexistent instance by exid', () => {
      then('returns null', async () => {
        const { context } = scene;
        const session = await getEc2InstanceSession(
          { by: { instance: { exid: 'nonexistent-instance-12345' } } },
          context,
        );

        expect(session).toBeNull();
      });
    });

    when('[t2] setEc2InstanceSession for nonexistent instance', () => {
      then('throws BadRequestError', async () => {
        const { context } = scene;

        await expect(
          setEc2InstanceSession(
            {
              session: DeclaredAwsEc2InstanceSession.as({
                instance: { id: 'i-nonexistent12345' },
                status: 'active',
              }),
            },
            context,
          ),
        ).rejects.toThrow(/cant find instance/);
      });
    });
  });

  givenRealInfra('[case4] instance ref variants', () => {
    when('[t0] getEc2InstanceSession by instance exid', () => {
      then('routes to correct instance', async () => {
        const { context } = scene;
        const session = await getEc2InstanceSession(
          { by: { instance: { exid: testExid } } },
          context,
        );

        expect(session).not.toBeNull();
        expect(session?.status).toBeDefined();
      });
    });

    when('[t1] setEc2InstanceSession by instance exid', () => {
      then('controls correct instance', async () => {
        const { context, instance } = scene;

        // get current status via id
        const sessionById = await getEc2InstanceSession(
          { by: { instance: { id: instance.id } } },
          context,
        );

        // set via exid
        const session = await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { exid: testExid },
              status: sessionById!.status, // same status for idempotency
            }),
          },
          context,
        );

        expect(session.status).toBe(sessionById!.status);
      });
    });
  });

  /**
   * .what = SSM connectivity test after hibernation resume
   * .why = verifies SSM agent restores correctly after hibernate/resume cycle
   * .note
   *   - requires ssm:SendCommand, ssm:GetCommandInvocation permissions
   *   - demo-agent lacks these permissions; run locally with proper credentials
   *   - test is kept simple: echo command verifies SSM reachability
   */
  givenRealInfra('[case5] SSM connectivity after resume', () => {
    when('[t0] resume from hibernated and execute SSM command', () => {
      then('SSM command succeeds', async () => {
        const { context, instance } = scene;

        // ensure instance is active first
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        // hibernate instance
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'hibernated',
            }),
          },
          context,
        );

        // resume instance
        await setEc2InstanceSession(
          {
            session: DeclaredAwsEc2InstanceSession.as({
              instance: { id: instance.id },
              status: 'active',
            }),
          },
          context,
        );

        // execute SSM command to verify SSM agent reachability
        // note: requires ssm:SendCommand permission (demo-agent lacks)
        try {
          const result = await execSsmCommand(
            {
              instance: { id: instance.id },
              commands: ['echo "ssm-connectivity-test"'],
              timeoutSeconds: 60,
            },
            context,
          );

          expect(result.status).toBe('Success');
          expect(result.stdout).toContain('ssm-connectivity-test');
          expect(result.exitCode).toBe(0);
        } catch (error) {
          // SSM permissions not available — fail fast with typed error check
          // AWS SDK v3 uses error.name for error type identification
          const awsError = error as Error & { name?: string };
          const isAccessDenied =
            awsError.name === 'AccessDeniedException' ||
            awsError.name === 'AccessDenied';

          if (isAccessDenied)
            BadRequestError.throw('ssm:SendCommand permission required', {
              hint: 'grant ssm:SendCommand to test role or run with elevated credentials',
              errorName: awsError.name,
            });

          throw error;
        }
      });
    });
  });
});
