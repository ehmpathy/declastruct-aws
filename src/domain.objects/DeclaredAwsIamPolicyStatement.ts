import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsIamPolicyCondition } from './DeclaredAwsIamPolicyCondition';
import { DeclaredAwsIamPrincipal } from './DeclaredAwsIamPrincipal';
import { DeclaredAwsIamPrincipalScope } from './DeclaredAwsIamPrincipalScope';
import { DeclaredAwsIamStatementScope } from './DeclaredAwsIamStatementScope';

/**
 * .what = an iam policy statement (permission rule)
 * .why = defines a single allow/deny rule within an iam policy document
 *
 * .note
 *   - used both in inline role policies and trust policies
 *   - this is a literal (value object) since it has no identity — just shape
 *   - resource/action/principal accept a `{ include, exclude }` Scope; `exclude` maps to
 *     the AWS `NotResource` / `NotAction` / `NotPrincipal` element. a bare value is the
 *     shorthand for `{ include: X }` (the positive element)
 */
export interface DeclaredAwsIamPolicyStatement {
  /**
   * .what = optional identifier for the statement
   * .note = useful for documentation and to debug
   */
  sid?: string;

  /**
   * .what = whether this statement allows or denies the actions
   */
  effect: 'Allow' | 'Deny';

  /**
   * .what = the principal this statement matches or excludes
   * .note = required for trust policies; omit for permission policies
   * .example = { service: 'lambda.amazonaws.com' } (bare = include) or '*' or
   *   { exclude: { aws: 'arn:aws:iam::123:root' } } (→ NotPrincipal)
   */
  principal?: '*' | DeclaredAwsIamPrincipal | DeclaredAwsIamPrincipalScope;

  /**
   * .what = the actions this statement matches or excludes
   * .example = 's3:GetObject' or ['s3:GetObject', 's3:PutObject'] (bare = include) or
   *   { exclude: 's3:DeleteObject' } (→ NotAction)
   */
  action: string | string[] | DeclaredAwsIamStatementScope;

  /**
   * .what = the resources this statement matches or excludes
   * .example = 'arn:aws:s3:::bucket/*' or '*' (bare = include) or
   *   { exclude: 'arn:aws:ssm:*:*:parameter/cicd/scope=plan/*' } (→ NotResource)
   * .note = required for permission policies; must be omitted for trust policies
   */
  resource?: string | string[] | DeclaredAwsIamStatementScope;

  /**
   * .what = optional conditions for when this statement applies
   * .note = structured as { operator: { key: value } }
   */
  condition?: DeclaredAwsIamPolicyCondition;
}

export class DeclaredAwsIamPolicyStatement
  extends DomainLiteral<DeclaredAwsIamPolicyStatement>
  implements DeclaredAwsIamPolicyStatement
{
  /**
   * .what = nested domain object definitions
   * .note
   *   - `resource`/`action` nest a single `DeclaredAwsIamStatementScope`; a bare
   *     scalar or array is left un-hydrated (domain-objects skips bare values under a
   *     nested key), so the shorthand stays bare while `{ include, exclude }` hydrates
   *   - `principal` nests two options; a bare `{ service }` maps to
   *     `DeclaredAwsIamPrincipal`, an explicit `{ include, exclude }` maps to
   *     `DeclaredAwsIamPrincipalScope`. both carry strict schemas, so domain-objects
   *     disambiguates them structurally with no `_dobj` tag. a bare `'*'` is a scalar,
   *     so it is left un-hydrated
   */
  public static nested = {
    resource: DeclaredAwsIamStatementScope,
    action: DeclaredAwsIamStatementScope,
    principal: [DeclaredAwsIamPrincipal, DeclaredAwsIamPrincipalScope],
    condition: DeclaredAwsIamPolicyCondition,
  };
}
