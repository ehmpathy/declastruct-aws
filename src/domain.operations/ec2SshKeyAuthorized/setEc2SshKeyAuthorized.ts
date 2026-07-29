import type { HasReadonly } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { sdkSsm } from '@src/access/sdks/sdkSsm';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getOneEc2InstanceId } from '@src/domain.operations/ec2Instance/getOneEc2InstanceId';
import { execSsmCommand } from '@src/domain.operations/ssmCommand/execSsmCommand';

import { asEc2SshKeyAuthorized } from './asEc2SshKeyAuthorized';
import { asEc2SshKeyAuthorizedSsmParameterName } from './asEc2SshKeyAuthorizedSsmParameterName';
import { assertSshKeyPushSucceeded } from './assertSshKeyPushSucceeded';

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
  // look up the live instance primary ref to authorize the key on (lean id-only
  // lookup — the key push + the recorded identity marker both need only the id)
  const liveInstanceRef = await getOneEc2InstanceId(
    { by: { unique: input.instance } },
    context,
  );
  if (!liveInstanceRef)
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
      instance: liveInstanceRef,
      commands: [appendKeyCommand],
      timeoutSeconds: 60,
    },
    context,
  );
  assertSshKeyPushSucceeded({ authorization, instance: input.instance });

  // compute ssm parameter name from unique key (shared transformer — get/set agree)
  const paramName = asEc2SshKeyAuthorizedSsmParameterName({
    instanceExid: input.instance.exid,
    comment: input.comment,
  });

  // compute fingerprint from public key if not provided
  const fingerprint =
    input.fingerprint ?? computeSshKeyFingerprint(input.publicKey);

  // prepare value to store
  // note: record the LIVE instance-id the key was appended to — it is the
  //   control-plane marker the get compares to detect a rebuild (a fresh box under
  //   the same exid has a new id + a wiped disk). see
  //   rule.forbid.in-guest-connection-for-drift-check
  const authorizedAt = input.authorizedAt ?? new Date().toISOString();
  const paramValue = JSON.stringify({
    publicKey: input.publicKey,
    fingerprint,
    authorizedAt,
    comment: input.comment,
    user: input.user,
    instanceId: liveInstanceRef.id,
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

  // construct the return from the param value we just wrote — the SAME transformer the
  // get uses, so the shape is identical, WITHOUT a redundant getEc2Instance round-trip.
  // a re-fetch (self-get) would re-run the stale-check's DescribeInstances + subnet + SG
  // lookups, which could report a successful key push as a failed apply on a transient
  // lookup hiccup — a spurious failure this avoids.
  return asEc2SshKeyAuthorized({
    instanceExid: input.instance.exid,
    paramValue,
  });
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
