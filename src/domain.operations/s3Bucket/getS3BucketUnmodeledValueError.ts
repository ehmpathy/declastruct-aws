import { UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = builds the fail-loud error for an aws value, read off a bucket, that this package does not model
 * .why = the bare `withAssure` rejection names only the check and the value — it leaves the reader
 *   to grep for the modeled set and guess the next move. F8 ruled the read-boundary errors carry the
 *   bucket, the field, the value, the modeled set, and the fix (case=4), and that the extant
 *   storage-class check be lifted to the same shape so the family stays symmetric
 *
 * .note = an UnexpectedCodePathError, as the I-7 read conflict beside it: the caller did no wrong;
 *   aws returned a value this package's model has not caught up to
 */
export const getS3BucketUnmodeledValueError = (input: {
  bucket: string;
  field: string;
  value: string;
  modeled: readonly string[];
}): UnexpectedCodePathError =>
  new UnexpectedCodePathError(
    `bucket "${input.bucket}" reads ${input.field} = "${input.value}", a value declastruct-aws does not model (modeled: ${input.modeled.join(', ')}). it fails loud rather than guess, since a guess would skew the plan. fix: upgrade declastruct-aws; if already on the latest, file an issue at ehmpathy/declastruct-aws that names this field and value`,
    {
      bucket: input.bucket,
      field: input.field,
      value: input.value,
      modeled: input.modeled,
    },
  );

/**
 * .what = narrows a raw aws string to its modeled union, or throws the error above
 * .why = the one read-boundary shape both unmodeled-value checks share (version state, storage
 *   class), so the family cannot drift back to two error forms
 */
export const assureS3BucketModeledValue = <TModeled extends string>(input: {
  bucket: string;
  field: string;
  value: string;
  isModeled: (value: string) => value is TModeled;
  modeled: readonly string[];
}): TModeled => {
  if (input.isModeled(input.value)) return input.value;
  throw getS3BucketUnmodeledValueError(input);
};
