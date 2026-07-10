import { DomainLiteral } from 'domain-objects';

/**
 * .what = an include-or-exclude scope for a string-valued statement match field
 *   (resource, action)
 * .why = models AWS's positive vs negated policy elements (`Resource` vs `NotResource`,
 *   `Action` vs `NotAction`) as one nested value, so a bare shorthand and an explicit
 *   exclusion share one field
 * .note
 *   - `include` maps to the positive element; `exclude` maps to the `Not*` element
 *   - exactly one of the two is meant to be set; the write cast fails fast on both-set
 *     (which would map to a statement with both `Resource` and `NotResource`, forbidden
 *     by AWS) and on an empty exclusion
 *   - a bare `string | string[]` on the field is the shorthand for `{ include: X }`
 */
export interface DeclaredAwsIamStatementScope {
  /**
   * .what = the values this statement matches (→ positive element)
   * .example = 'arn:aws:s3:::bucket/*' or ['s3:GetObject', 's3:PutObject']
   */
  include?: string | string[];

  /**
   * .what = the values this statement excludes (→ negated `Not*` element)
   * .example = { exclude: 'arn:aws:ssm:*:*:parameter/cicd/scope=plan/*' } → NotResource
   */
  exclude?: string | string[];
}

export class DeclaredAwsIamStatementScope
  extends DomainLiteral<DeclaredAwsIamStatementScope>
  implements DeclaredAwsIamStatementScope {}
