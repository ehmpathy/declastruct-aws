import type { HasReadonly, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { sdkSsm } from '@src/access/sdks/sdkSsm';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';
import { getOneEc2InstanceId } from '@src/domain.operations/ec2Instance/getOneEc2InstanceId';

import { asEc2SshKeyAuthorized } from './asEc2SshKeyAuthorized';
import { asEc2SshKeyAuthorizedRecordedInstance } from './asEc2SshKeyAuthorizedRecordedInstance';
import { asEc2SshKeyAuthorizedSsmParameterName } from './asEc2SshKeyAuthorizedSsmParameterName';
import { isEc2SshKeyAuthorizedStale } from './isEc2SshKeyAuthorizedStale';

/**
 * .what = gets an authorized SSH key by unique key (instance + comment)
 * .why = enables lookup of authorized keys for an instance, from the LIVE box's
 *        identity rather than a stale tracked param
 * .note
 *   - the tracked SSM param is keyed by the box's STABLE exid, so it outlives a
 *     terminate-and-recreate; on its own it would report a key the fresh disk lacks.
 *     so existence is decided by a compare of the param's RECORDED instance-id to the
 *     LIVE instance-id — a mismatch (a rebuild) reads as absent → CREATE → re-push
 *   - this is a CONTROL-PLANE compare (DescribeInstances), never a connection INTO
 *     the box; see rule.forbid.in-guest-connection-for-drift-check. it therefore
 *     works even against a stopped box
 */
export const getOneEc2SshKeyAuthorizedByUnique = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsEc2SshKeyAuthorized> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2SshKeyAuthorized> | null> => {
  // compute ssm parameter name from unique key (shared transformer — get/set agree)
  const paramName = asEc2SshKeyAuthorizedSsmParameterName({
    instanceExid: input.by.unique.instance.exid,
    comment: input.by.unique.comment,
  });

  // get ssm parameter (the track layer)
  const param = await sdkSsm.getOneParameter({ name: paramName }, context);

  // return null if the tracked param is absent
  if (!param) return null;

  // read the instance the key was recorded against, as a ref (control-plane marker)
  const recordedInstance = asEc2SshKeyAuthorizedRecordedInstance({
    paramValue: param.value,
  });

  // look up the LIVE box's primary ref by exid to compare identity (never connects into
  // the box). the lean id-only lookup is deliberate: it degrades to null on an absent
  // box WITHOUT the subnet/security-group resolution (and its hard-throws) that the full
  // getEc2Instance chains — so a transient VPC hiccup can never abort this plan-time
  // get (see rule.forbid.in-guest-connection-for-drift-check)
  const liveInstance = await getOneEc2InstanceId(
    { by: { unique: input.by.unique.instance } },
    context,
  );

  // treat the param as absent if the box was replaced since the key was recorded —
  // a rebuilt box's fresh disk lacks the key, so this reconciles to CREATE. both sides
  // are instance refs, so the pure compare speaks identity with no id unwrap
  if (
    isEc2SshKeyAuthorizedStale({
      recorded: recordedInstance,
      live: liveInstance,
    })
  )
    return null;

  // cast to domain object
  return asEc2SshKeyAuthorized({
    instanceExid: input.by.unique.instance.exid,
    paramValue: param.value,
  });
};
