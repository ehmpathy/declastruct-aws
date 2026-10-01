import { DomainLiteral } from 'domain-objects';
import type { IsoDurationShape } from 'iso-time';
import { withAssure } from 'type-fns';

/**
 * .what = a duration denominated in whole days — the only unit S3 lifecycle accepts
 * .why = S3 `Expiration.Days`, `NoncurrentDays`, and `AbortIncompleteMultipartUpload.DaysAfterInitiation`
 *   are integer-day fields. this narrows iso-time's `IsoDurationShape` to days-only, so a non-day
 *   unit is a COMPILE error rather than a runtime reject (rule.prefer.prevent-over-correct rung 1).
 *
 * .note
 *   - grounded in the iso-time glossary (rule.require.iso-time): `{ days: 30 }` is a valid
 *     `IsoDurationShape`, so any iso-time helper (toMilliseconds, addDuration) accepts it
 *   - `{ days }` reads at the call site as a sentence — `expire: { days: 30 }` — where a bare
 *     `expireAfterDays: 30` named no subject and could collide with a count (F17)
 *   - a DomainLiteral so it hydrates + serializes as a nested leaf. every `expire` field that
 *     holds it declares it in `static nested`, so declastruct's KEEP compare
 *     (`serialize(omitReadonly(bucket))`) never meets a bare object bag it refuses to manipulate
 */
export interface IsoDurationInDays
  extends Required<Pick<IsoDurationShape, 'days'>> {}

export class IsoDurationInDays
  extends DomainLiteral<IsoDurationInDays>
  implements IsoDurationInDays
{
  /**
   * .what = no nested domain objects — `days` is a primitive
   */
  public static nested = {};
}

/**
 * .what = asserts a value is a POSITIVE WHOLE-day duration `{ days: integer >= 1 }`
 * .why = the narrow type closes THREE of the four headaches at compile time (non-day units,
 *   calendar approximation, sub-day units are all unrepresentable). the type cannot reject two
 *   more that `number` admits: a non-integer `{ days: 30.5 }` and a non-positive `{ days: 0 }` /
 *   `{ days: -1 }`. aws expires on whole days and requires a POSITIVE count, so both are rejected
 *   near the field rather than deep in the api's MalformedXML error (F17): `.assure` on the
 *   DESIRED side fails loud before a bad day-count reaches aws
 *   (rule.require.assure-via-type-checks, rule.prefer.prevent-over-correct)
 */
export const isIsoDurationInDays = withAssure(
  (value: unknown): value is IsoDurationInDays =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { days?: unknown }).days === 'number' &&
    Number.isInteger((value as { days: number }).days) &&
    (value as { days: number }).days > 0,
  { name: 'isIsoDurationInDays' },
);
