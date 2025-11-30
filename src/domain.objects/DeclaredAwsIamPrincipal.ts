import { DomainLiteral } from 'domain-objects';

/**
 * .what = principal specification for trust policies
 * .why = defines who can assume a role or access a resource
 * .note = only one principal type can be specified per statement
 */
export interface DeclaredAwsIamPrincipal {
  /**
   * .what = aws account, user, or role arns
   * .example = 'arn:aws:iam::123456789012:root'
   */
  aws?: string | string[];

  /**
   * .what = aws service principals
   * .example = 'lambda.amazonaws.com'
   */
  service?: string | string[];

  /**
   * .what = federated identity provider arns
   * .example = 'arn:aws:iam::123456789012:saml-provider/MyProvider'
   */
  federated?: string | string[];
}

export class DeclaredAwsIamPrincipal
  extends DomainLiteral<DeclaredAwsIamPrincipal>
  implements DeclaredAwsIamPrincipal {}
