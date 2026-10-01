import { BadRequestError } from 'helpful-errors';

/**
 * .what = rejects a `versions.expire.keep` count outside aws's whole-number 1-100 bounds
 * .why = `keep` maps to `NewerNoncurrentVersions`, which aws bounds at a whole number from 1 to 100.
 *   the declared type is `number | null`, so it admits `0`, `101`, and `2.5` — this is the one runtime
 *   check that type leaves open, and it fails loud NEAR the field with a named fix rather than as a
 *   MalformedXML deep in the api (rule.prefer.prevent-over-correct, rule.require.errors-name-the-fix)
 *
 * .note
 *   - the peer axis has its own guard — `assertS3BucketLifecycleDaysInBounds` covers `expire.after`.
 *     this one covers `expire.keep`, so both axes of a `VersionExpiry` are checked before either reaches aws
 *   - ⚠️ this is an `assert*`, NOT an `is*` + `withAssure`. deliberate:
 *     `withAssure` emits only the check name and the rejected value, and F8 ruled this wish's errors
 *     carry a named `fix` beside them. a type-check here would trade that fix line for a narrowed
 *     type the caller does not need — `keep` is already `number`
 */
export const assertS3BucketVersionKeepCountInBounds = (input: {
  keep: number;
}): void => {
  const { keep } = input;

  if (!Number.isInteger(keep) || keep < 1 || keep > 100)
    throw new BadRequestError(
      'NewerNoncurrentVersions must be a whole number 1-100',
      {
        keep,
        fix: 'declare `keep` as a whole number from 1 to 100',
      },
    );
};
