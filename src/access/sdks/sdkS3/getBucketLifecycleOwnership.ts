import { DECLASTRUCT_LIFECYCLE_RULE_ID } from './declastructLifecycleRuleId';

/**
 * .what = splits a bucket's lifecycle rules into the declastruct-owned rule (by id) + the ids of
 *   any foreign rules
 * .why = a pure ownership verdict so BOTH the get (return only ours, never adopt a foreign rule)
 *   and the put (fail loud before a replace-all would destroy a foreign rule) share one testable
 *   source of truth — mirrors the extant getReceiptRuleSetActiveVerdict pattern that made the
 *   receipt-rule-set active-slot guard unit-testable without a remote-boundary mock
 */
export const getBucketLifecycleOwnership = <T extends { ID?: string }>(input: {
  rules: T[];
}): { owned: T | null; foreignRuleIds: string[] } => {
  const owned =
    input.rules.find((rule) => rule.ID === DECLASTRUCT_LIFECYCLE_RULE_ID) ??
    null;
  const foreignRuleIds = input.rules
    .filter((rule) => rule.ID !== DECLASTRUCT_LIFECYCLE_RULE_ID)
    .map((rule) => rule.ID ?? '(unnamed)');
  return { owned, foreignRuleIds };
};
