import { DomainLiteral } from 'domain-objects';

/**
 * .what = a money amount as returned by the AWS Cost Explorer apis
 * .why = cost amounts are high-precision decimal STRINGS (e.g. '39.1603300457');
 *        they must NEVER be coerced to a js `number` (float64), which silently
 *        drops precision on long decimals and large sums — a money-corruption bug.
 *        so we preserve the exact string AWS returns, paired with its currency unit.
 * .note = shared across all cost-report resources (spend + savings)
 * .note = the FAMILY money-shape rule: use this `{ amount, unit }` type when AWS returns
 *         a CurrencyCode for the field, so the currency travels WITH the number. when AWS
 *         returns a bare decimal with NO currency code (e.g. a ratio, a percentage, or a
 *         commitment figure the api leaves unit-less), keep it a bare decimal `string` —
 *         do NOT invent a unit. each cast documents its per-field choice; this is the one
 *         place that states why the two shapes coexist across the family
 */
export interface DeclaredAwsCostAmount {
  /**
   * .what = the decimal amount, kept as a string to preserve precision
   * .example = '16.42' or '39.1603300457'
   */
  amount: string;

  /**
   * .what = the currency unit
   * .example = 'USD'
   */
  unit: string;
}

export class DeclaredAwsCostAmount
  extends DomainLiteral<DeclaredAwsCostAmount>
  implements DeclaredAwsCostAmount {}
