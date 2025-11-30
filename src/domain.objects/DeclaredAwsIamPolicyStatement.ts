import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsIamPrincipal } from './DeclaredAwsIamPrincipal';

// re-export for backwards compatibility
export { DeclaredAwsIamPrincipal };

/**
 * .what = an iam policy statement (permission rule)
 * .why = defines a single allow/deny rule within an iam policy document
 *
 * .note
 *   - used both in inline role policies and trust policies
 *   - this is a literal (value object) since it has no identity — just shape
 */
export interface DeclaredAwsIamPolicyStatement {
  /**
   * .what = optional identifier for the statement
   * .note = useful for documentation and debugging
   */
  sid?: string;

  /**
   * .what = whether this statement allows or denies the actions
   */
  effect: 'Allow' | 'Deny';

  /**
   * .what = the principal this statement applies to
   * .note = required for trust policies; omit for permission policies
   * .example = { service: 'lambda.amazonaws.com' } or '*'
   */
  principal?: '*' | DeclaredAwsIamPrincipal;

  /**
   * .what = the actions this statement applies to
   * .example = 's3:GetObject' or ['s3:GetObject', 's3:PutObject']
   */
  action: string | string[];

  /**
   * .what = the resources this statement applies to
   * .example = 'arn:aws:s3:::bucket/*' or '*'
   * .note = required for permission policies; must be omitted for trust policies
   */
  resource?: string | string[];

  /**
   * .what = optional conditions for when this statement applies
   * .note = structured as { operator: { key: value } }
   */
  condition?: Record<string, Record<string, string | string[]>>;
}

export class DeclaredAwsIamPolicyStatement
  extends DomainLiteral<DeclaredAwsIamPolicyStatement>
  implements DeclaredAwsIamPolicyStatement
{
  /**
   * .what = nested domain object definitions
   * .note = condition is Record<string, Record<string, ...>>, marked as DomainLiteral for safe manipulation
   */
  public static nested = {
    principal: DeclaredAwsIamPrincipal,
    condition: DomainLiteral,
  };
}
