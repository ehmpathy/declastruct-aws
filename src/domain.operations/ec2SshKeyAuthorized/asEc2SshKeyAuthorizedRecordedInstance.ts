import type { RefByPrimary } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = reads the instance a key was recorded against, as a primary ref, from a
 *         tracked ssh-key SSM param value
 * .why = the get compares this recorded instance to the live box to detect a rebuild
 *        (a fresh box under the same exid). a named transformer holds the parse so the
 *        get stays an orchestrator with no inline decode-friction, and casts the stored
 *        id scalar into a domain ref at this boundary so everything downstream speaks
 *        Ec2 refs rather than a bare instance-id string
 * .note
 *   - returns null for a legacy param written before the instance-id was recorded
 *     (external-data boundary; a null forces a one-time re-push that upgrades it)
 */
export const asEc2SshKeyAuthorizedRecordedInstance = (input: {
  paramValue: string;
}): RefByPrimary<typeof DeclaredAwsEc2Instance> | null => {
  // parse the stored JSON; only the recorded instanceId is read here.
  // the `as` cast is safe at this data boundary: the param value is written solely by
  // setEc2SshKeyAuthorized as this exact JSON shape, so instanceId is either a string
  // or absent (legacy). removal path: when a shared asEc2SshKeyAuthorizedRecord parse
  // is extracted (rule-of-three, once a third consumer appears), read the id from that
  // typed record instead of a second local parse.
  const data = JSON.parse(input.paramValue) as { instanceId?: string };

  // legacy params (pre-instance-id) lack the field → null; else cast the stored scalar
  // into a primary ref so the downstream compare speaks instance identity, not a string
  return data.instanceId ? { id: data.instanceId } : null;
};
