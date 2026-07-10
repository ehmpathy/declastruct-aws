/**
 * .what = the three ways a pre-extant resource's ownership marker can relate to a
 *   caller's expected marker
 * .why = a set op that adopts a resource keyed on a SUBSET of its identity (e.g. a subnet
 *   keyed on (vpc, cidr), an association keyed on subnet-id) must know whether the extant
 *   resource is a safe orphan, already ours, or a foreign owner it must not overrule —
 *   see rule.forbid.silent-resource-theft
 */
export type ResourceOwnershipVerdict = 'unowned' | 'ours' | 'foreign';

/**
 * .what = classifies a pre-extant resource's ownership from its `exid` marker
 * .why = centralizes the ownership gate that guards adoption in every set op with a
 *   subset natural key, so the "never steal a foreign claim" rule is decided one way in
 *   one place (pure, unit-tested) rather than re-derived per call site
 * .note
 *   - `unowned` — no detected marker (a genuine orphan) → safe to adopt
 *   - `ours` — detected marker equals the expected exid → no-op (it is already us)
 *   - `foreign` — detected marker differs from the expected exid → the caller must fail loud
 *   - an empty-string marker is treated as absent (unowned), since AWS returns no
 *     meaningful ownership from a blank tag value
 */
export const getResourceOwnershipVerdict = (input: {
  exidDetected: string | null | undefined;
  exidExpected: string;
}): ResourceOwnershipVerdict => {
  // no detected marker (absent or blank) means the resource carries no ownership claim
  if (!input.exidDetected) return 'unowned';

  // a detected marker that matches the expected exid means the resource is already ours
  if (input.exidDetected === input.exidExpected) return 'ours';

  // any other detected marker is a foreign owner's claim
  return 'foreign';
};
