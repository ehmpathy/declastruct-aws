import { BadRequestError } from 'helpful-errors';

/**
 * .what = builds the actionable fail-loud error for a bucket that already holds a FOREIGN
 *   lifecycle rule (one declastruct does not own) before a whole-bucket replace-all
 * .why = both the s3 PutBucketLifecycleConfiguration (write) and DeleteBucketLifecycleConfiguration
 *   (delete) calls are REPLACE-ALL, so a blind write OR delete would silently destroy a rule a
 *   human (or another IaC tool) added via the console (rule.forbid.silent-resource-theft). a pure
 *   builder makes the exact error text a human reads unit-snappable + drift-guarded, the same way
 *   getReceiptRuleSetActiveVerdict + the region guard surface their messages
 */
export const getBucketLifecycleForeignRuleError = (input: {
  name: string;
  foreignRuleIds: string[];
}): BadRequestError =>
  new BadRequestError(
    `bucket "${input.name}" already holds foreign lifecycle rule(s) [${input.foreignRuleIds.join(', ')}] that declastruct does not own. a whole-bucket replace-all would destroy them. fix by one of: remove the foreign rule(s) in the console, or reconcile them into the declared lifecycle`,
    { bucket: input.name, foreignRuleIds: input.foreignRuleIds },
  );
