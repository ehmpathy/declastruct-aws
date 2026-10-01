import { BadRequestError } from 'helpful-errors';

import type { DeclaredAwsS3BucketLifecycle } from './DeclaredAwsS3BucketLifecycle';

/**
 * .what = rejects a fully-actionless lifecycle — one that declares nothing on any of its three
 *   subjects — and teaches the idiom for "no lifecycle" (case=8, I-6)
 * .why = a `lifecycle` object whose `objects` has no expiry and no transitions, whose `versions` is
 *   `false`, and whose `multiparts` has no expiry is a rule that acts on NONE of them. aws itself
 *   rejects an actionless rule, but the failure there is a MalformedXML deep in the api; this fails
 *   loud NEAR the field and names the fix — `lifecycle: null`, the idiom the shape's own doc defines
 *   as the PERSIST mode (rule.prefer.prevent-over-correct, rule.require.errors-name-the-fix)
 *
 * .note
 *   - ✅ the "aws rejects an actionless rule" premise is CITED, not assumed (verified 2026-09-21).
 *     the s3 user guide's `intro-lifecycle-rules` states each rule consists of "**One or more**
 *     transition or expiration actions". ⇒ a zero-action rule is not a rule aws models, which is
 *     what this guard front-runs. (it also settles half of A-6: the same page enumerates
 *     `NoncurrentVersionExpiration` as an expiration action and `AbortIncompleteMultipartUpload`
 *     as usable "in addition to the transition and expiration actions" — so a rule whose ONLY
 *     actions are those two satisfies the "one or more" bar with no `Transition` present)
 *   - the check keys on `versions === false`, NOT on "no expiry" — a `versions: { status: 'enabled' }`
 *     with no expiry is an ACTION (it turns versioning on), so it is actionful even with every
 *     `.expire` null. only a lifecycle that touches none of the three subjects is rejected
 *   - this is the earliest ENFORCEABLE fail-loud point: declastruct's plan (`computeChange`) and its
 *     DAO contract carry no validation hook, so a plan-time domain rejection is unimplementable
 *   - ⚠️ it is NOT "before any aws write". `setS3Bucket` calls `createBucket` first, so one write has
 *     already landed when this throws. that is safe — `createBucket` is idempotent, so the reject
 *     leaves an empty bucket a retry adopts — but it is not the guarantee this note once claimed.
 *     the guard that DOES precede every write is `assertS3BucketVersionsNotRetracted` (I-1), and
 *     only because its hazard is irreversible where this one's is not.
 *     ⇒ what this still buys: the reject lands NEAR the field, with a named fix, rather than as a
 *     MalformedXML deep in the api
 */
export const assertS3BucketLifecycleActionful = (input: {
  lifecycle: DeclaredAwsS3BucketLifecycle;
}): void => {
  const { lifecycle } = input;

  const objectsActionless =
    lifecycle.objects.expire == null &&
    lifecycle.objects.transitions.length === 0;
  const versionsActionless = lifecycle.versions === false;
  const multipartsActionless = lifecycle.multiparts.expire == null;

  if (objectsActionless && versionsActionless && multipartsActionless)
    throw new BadRequestError(
      'lifecycle declares no action on any subject (objects, versions, multiparts); aws rejects an actionless rule',
      {
        lifecycle,
        fix: "declare `lifecycle: null` to persist every object with no rule at all (the shape's persist mode), or add >=1 action",
      },
    );
};
