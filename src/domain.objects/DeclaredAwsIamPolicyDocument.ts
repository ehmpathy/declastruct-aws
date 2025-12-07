import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsIamPolicyStatement } from './DeclaredAwsIamPolicyStatement';

/**
 * .what = an iam policy document containing a list of policy statements
 * .why = encapsulates the structure of both trust policies and permission policies
 *
 * .note
 *   - this is a literal (value object) since it has no identity — just shape
 *   - used for trust policies on roles and inline policies attached to roles
 */
export interface DeclaredAwsIamPolicyDocument {
  /**
   * .what = the list of policy statements in this document
   */
  statements: DeclaredAwsIamPolicyStatement[];
}

export class DeclaredAwsIamPolicyDocument
  extends DomainLiteral<DeclaredAwsIamPolicyDocument>
  implements DeclaredAwsIamPolicyDocument
{
  public static nested = {
    statements: DeclaredAwsIamPolicyStatement,
  };
}
