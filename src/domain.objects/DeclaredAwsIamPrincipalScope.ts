import { DomainLiteral } from 'domain-objects';
import { z } from 'zod';

import { DeclaredAwsIamPrincipal } from './DeclaredAwsIamPrincipal';

/**
 * .what = an include-or-exclude scope for the principal statement match field
 * .why = models AWS's `Principal` vs `NotPrincipal` as one nested value, so a bare
 *   principal shorthand and an explicit exclusion share one field
 * .note
 *   - `include` maps to `Principal`; `exclude` maps to `NotPrincipal`
 *   - exactly one of the two is meant to be set; the write cast fails fast on both-set
 *     and on an empty/`'*'` exclusion (AWS `NotPrincipal: "*"` is nonsensical)
 *   - a bare `DeclaredAwsIamPrincipal` on the field is the shorthand for `{ include: X }`
 */
export interface DeclaredAwsIamPrincipalScope {
  /**
   * .what = the principal this statement matches (→ `Principal`)
   */
  include?: DeclaredAwsIamPrincipal;

  /**
   * .what = the principal this statement excludes (→ `NotPrincipal`)
   */
  exclude?: DeclaredAwsIamPrincipal;
}

export class DeclaredAwsIamPrincipalScope
  extends DomainLiteral<DeclaredAwsIamPrincipalScope>
  implements DeclaredAwsIamPrincipalScope
{
  /**
   * .what = hydrates the include/exclude principals into `DeclaredAwsIamPrincipal`
   * .why = keeps a nested principal an instance (manipulation-safe), same as any nested
   */
  public static nested = {
    include: DeclaredAwsIamPrincipal,
    exclude: DeclaredAwsIamPrincipal,
  };

  /**
   * .what = a strict schema keyed by `include`/`exclude` (no unknown keys)
   * .why = a strict (closed) schema lets domain-objects structurally disambiguate this
   *   from a bare `DeclaredAwsIamPrincipal` when both are nested options on a statement's
   *   `principal` field — this shape's keys (`include`/`exclude`) share no key with a
   *   principal's keys (`aws`/`service`/`federated`), so try-each-option settles them
   *   with no `_dobj` discriminator (see the nested-union brief)
   */
  public static schema = z
    .object({
      include: DeclaredAwsIamPrincipal.schema.optional(),
      exclude: DeclaredAwsIamPrincipal.schema.optional(),
    })
    .strict();
}
