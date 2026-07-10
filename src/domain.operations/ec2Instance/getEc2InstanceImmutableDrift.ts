import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = lists the IMMUTABLE attributes that differ between an extant EC2 instance
 *   and a desired one
 * .why = an EC2 instance cannot change its launch template, subnet, security groups,
 *   or public-ip association in place — those require a terminate + recreate. but
 *   `sourceDestCheck` IS mutable (ModifyInstanceAttribute changes it on a live
 *   instance), so a drift on it must reconcile in place, NOT dead-end the apply. this
 *   classifies exactly which drifts are the immutable kind, so setEc2Instance fails
 *   loud only when a recreate is truly required — see rule.require.guaranteed-idempotency
 * .note
 *   - refs are compared by their natural key (exid) when present, else by id, so an
 *     extant instance (cast to exid refs) compares cleanly against a desired exid ref
 *   - sourceDestChecked is intentionally NOT compared here — it is the mutable attribute
 *     the caller reconciles in place
 */
export const getEc2InstanceImmutableDrift = (input: {
  found: DeclaredAwsEc2Instance;
  desired: DeclaredAwsEc2Instance;
}): string[] => {
  const { found, desired } = input;

  // reduce a ref to a comparable key: prefer the exid natural key, fall back to id
  const refKey = (
    ref: { exid?: string; id?: string } | null | undefined,
  ): string | null => (ref ? (ref.exid ?? ref.id ?? null) : null);

  // collect the immutable attributes that differ
  const drift: string[] = [];

  // template — cannot swap the launch template of a live instance
  if (refKey(found.template) !== refKey(desired.template))
    drift.push('template');

  // subnet — placement is fixed at launch
  if (refKey(found.network.subnet) !== refKey(desired.network.subnet))
    drift.push('network.subnet');

  // security groups — compared as a set of natural keys (order-independent)
  const groupKeys = (instance: DeclaredAwsEc2Instance): string =>
    instance.network.security.groups
      .map((group) => refKey(group))
      .sort()
      .join(',');
  if (groupKeys(found) !== groupKeys(desired))
    drift.push('network.security.groups');

  // public-ip association — set at launch via the primary network interface
  if (
    found.network.interface.publicIpEnabled !==
    desired.network.interface.publicIpEnabled
  )
    drift.push('network.interface.publicIpEnabled');

  return drift;
};
