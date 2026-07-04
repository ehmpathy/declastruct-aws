import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { sdkSsm } from '@src/access/sdks/sdkSsm';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';

import { getOneEc2SshKeyAuthorizedByUnique } from './getOneEc2SshKeyAuthorizedByUnique';

/**
 * .what = durably authorizes an SSH key on an EC2 instance
 * .why = appends the public key into the login user's ~/.ssh/authorized_keys on
 *        the instance's EBS disk (via an SSM shell command), so the authorization
 *        is DURABLE — it survives stop/start and hibernate/resume — then records it
 *        in SSM Parameter Store (the track layer that get + idempotency read)
 * .note
 *   - the instance must be RUNNING so its SSM agent can receive the command
 *   - the append is idempotent: the key line is added only if not already present,
 *     so re-authorizing never duplicates it
 *   - runs as root via SSM, so it can chown the file back to the login user
 */
export const setEc2SshKeyAuthorized = async (
  input: DeclaredAwsEc2SshKeyAuthorized,
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2SshKeyAuthorized>> => {
  // look up the instance to authorize the key on
  const instance = await getEc2Instance(
    { by: { unique: input.instance } },
    context,
  );
  if (!instance)
    BadRequestError.throw('instance not found; cannot authorize ssh key', {
      instance: input.instance,
    });

  // durably append the key into the login user's authorized_keys on the box
  // (survives stop/start)
  // note: base64-encode the key so no shell metacharacter in it can break the command
  const publicKeyBase64 = Buffer.from(input.publicKey).toString('base64');
  const appendKeyCommand = [
    'set -e',
    `HOME_DIR=$(getent passwd "${input.user}" | cut -d: -f6)`,
    'mkdir -p "$HOME_DIR/.ssh"',
    'touch "$HOME_DIR/.ssh/authorized_keys"',
    `KEY=$(echo "${publicKeyBase64}" | base64 -d)`,
    'grep -qF "$KEY" "$HOME_DIR/.ssh/authorized_keys" || echo "$KEY" >> "$HOME_DIR/.ssh/authorized_keys"',
    `chown -R "${input.user}":"${input.user}" "$HOME_DIR/.ssh"`,
    'chmod 700 "$HOME_DIR/.ssh"',
    'chmod 600 "$HOME_DIR/.ssh/authorized_keys"',
  ].join('\n');

  const authorization = await execSsmCommand(
    {
      instance: { id: instance.id },
      commands: [appendKeyCommand],
      timeoutSeconds: 60,
    },
    context,
  );
  if (authorization.status !== 'Success')
    UnexpectedCodePathError.throw(
      'ssm command did not report success when it appended the ssh key',
      {
        instance: input.instance,
        status: authorization.status,
        stderr: authorization.stderr,
      },
    );

  // compute ssm parameter name from unique key
  const paramName = `/declastruct/ec2/ssh-keys/${input.instance.exid}/${input.comment}`;

  // compute fingerprint from public key if not provided
  const fingerprint =
    input.fingerprint ?? computeSshKeyFingerprint(input.publicKey);

  // prepare value to store
  const authorizedAt = input.authorizedAt ?? new Date().toISOString();
  const paramValue = JSON.stringify({
    publicKey: input.publicKey,
    fingerprint,
    authorizedAt,
    comment: input.comment,
    user: input.user,
  });

  // record the authorization in ssm parameter store (track layer)
  await sdkSsm.setParameter(
    {
      name: paramName,
      value: paramValue,
      type: 'SecureString',
      description: `SSH key authorization for ${input.instance.exid}`,
    },
    context,
  );

  // return the authorized key
  const result = await getOneEc2SshKeyAuthorizedByUnique(
    {
      by: {
        unique: {
          instance: input.instance,
          comment: input.comment,
        },
      },
    },
    context,
  );

  // should always find the key we just created
  if (!result)
    UnexpectedCodePathError.throw('failed to retrieve key after creation', {
      instance: input.instance,
      comment: input.comment,
    });

  return result;
};

/**
 * .what = computes SSH key fingerprint from public key
 * .why = provides unique identifier for the key
 * .note = simplified implementation; real fingerprint would use crypto
 */
const computeSshKeyFingerprint = (publicKey: string): string => {
  // extract the base64-encoded key data (second part of ssh key format)
  const parts = publicKey.trim().split(' ');
  const keyData = parts[1] ?? publicKey;

  // compute simple hash (in production, use SHA256)
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    const char = keyData.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // convert to 32-bit integer
  }

  return `SHA256:${Math.abs(hash).toString(16).padStart(8, '0')}`;
};
