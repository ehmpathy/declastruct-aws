import { BadRequestError } from 'helpful-errors';

/**
 * .what = asserts that exactly one of the named keys on an object holds a non-null value
 * .why = several domain unions ("exactly one of N is non-null") state the invariant in a
 *   comment only; no code enforces it, so a malformed value (0 or 2+ set) reaches AWS and
 *   surfaces as a raw, non-actionable SDK error at apply time. this makes the invariant fail
 *   loud at the transformer boundary with a clear domain error instead (rule.require.failfast)
 * .throws BadRequestError when zero, or two-or-more, of the keys are non-null
 */
export const assertExactlyOnePresent = <T extends object>(input: {
  of: T;
  keys: readonly (keyof T)[];
  label: string;
}): void => {
  const present = input.keys.filter((key) => input.of[key] != null);
  if (present.length === 1) return;

  BadRequestError.throw(
    `${input.label} must have exactly one of [${input.keys.join(', ')}] set, but ${present.length} are set`,
    { present, keys: input.keys },
  );
};
