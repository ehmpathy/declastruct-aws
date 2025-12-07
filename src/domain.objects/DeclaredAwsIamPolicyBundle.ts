import { DomainLiteral } from 'domain-objects';

import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';

/**
 * .what = a bundle of iam permissions combining managed and inline policies
 * .why = enables reusing a set of permissions across IAM roles and SSO permission sets
 *
 * .note
 *   - this is a literal (value object) since it has no identity — just shape
 *   - aws treats managed and inline policies as separate attachment mechanisms
 *   - this abstraction groups them for convenient code reuse
 */
export interface DeclaredAwsIamPolicyBundle {
  /**
   * .what = arns of aws managed policies to attach
   */
  managed: string[];

  /**
   * .what = inline policy document with custom statements
   */
  inline: DeclaredAwsIamPolicyDocument;
}

export class DeclaredAwsIamPolicyBundle
  extends DomainLiteral<DeclaredAwsIamPolicyBundle>
  implements DeclaredAwsIamPolicyBundle
{
  public static nested = {
    inline: DeclaredAwsIamPolicyDocument,
  };
}
