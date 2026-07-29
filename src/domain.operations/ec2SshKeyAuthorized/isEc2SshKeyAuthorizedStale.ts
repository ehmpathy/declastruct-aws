import { type RefByPrimary, serialize } from 'domain-objects';

import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = decides whether a tracked ssh-key authorization is STALE relative to the
 *   live box — i.e. the box was replaced (rebuilt) since the key was recorded
 * .why = the tracked SSM param is keyed by the box's stable exid, so it outlives a
 *   terminate-and-recreate; the recorded instance is what distinguishes the box the
 *   key was applied to from a fresh box under the same exid. a mismatch (or an absent
 *   recorded instance, or no live box) means the on-disk key was wiped by the rebuild
 *   and the param must be treated as absent → CREATE → re-push.
 * .note
 *   - this is a CONTROL-PLANE compare: the live instance is read from DescribeInstances,
 *     never by a connection INTO the box. see rule.forbid.in-guest-connection-for-drift-check
 *   - compares two instance PRIMARY REFS by identity (serialize), not bare instance-ids,
 *     so the contract speaks the domain's Ec2 ref rather than an any-string scalar
 *   - the accepted tradeoff: this does NOT catch a same-box out-of-band edit of
 *     authorized_keys (the instance is unchanged), by design
 */
export const isEc2SshKeyAuthorizedStale = (input: {
  /**
   * .what = the instance the key was recorded against when it was authorized
   * .note = null for a legacy param written before the instance was recorded
   */
  recorded: RefByPrimary<typeof DeclaredAwsEc2Instance> | null;

  /**
   * .what = the live instance under this exid right now
   * .note = null when no live instance exists (terminated, not yet recreated)
   */
  live: RefByPrimary<typeof DeclaredAwsEc2Instance> | null;
}): boolean => {
  // no live box → the key cannot be on any disk → stale (treat as absent → CREATE)
  if (!input.live) return true;

  // legacy param without a recorded instance → unverifiable → stale (one-time re-push
  // upgrades the param to the instance-bound format; benign, set is idempotent).
  // MIGRATION NOTE: every authorization written before this fix ships has a legacy
  //   (no-instance) param, so its first post-upgrade apply reads stale → CREATE →
  //   re-push, which needs the box ACTIVE. so a box with an extant ssh-key
  //   authorization must be active for that one first apply; after it, the param
  //   carries the instance and stop/start reads KEEP forever. see the release note
  //   in the execution yield.
  if (!input.recorded) return true;

  // the box was replaced since the key was recorded → the fresh disk lacks the key
  return serialize(input.recorded) !== serialize(input.live);
};
