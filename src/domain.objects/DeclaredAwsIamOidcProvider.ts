import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure representing an AWS IAM OIDC Provider
 * .why = enables github actions and other oidc-based federated auth
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [url] — each url can only have one provider per account
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateOpenIDConnectProvider.html
 */
export interface DeclaredAwsIamOidcProvider {
  /**
   * .what = the arn of the oidc provider
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the url of the identity provider (e.g., 'https://token.actions.githubusercontent.com')
   * .note = @unique — only one provider per url per account
   */
  url: string;

  /**
   * .what = client ids (audiences) allowed to authenticate
   * .note = typically 'sts.amazonaws.com' for aws role assumption
   */
  clientIds: string[];

  /**
   * .what = server certificate thumbprints for the oidc provider
   * .note = sha-1 hex fingerprints of the tls cert chain
   * .note = can be empty for AWS-trusted providers (GitHub, Google, Auth0)
   */
  thumbprints: string[];

  /**
   * .what = optional tags for the provider
   */
  tags?: DeclaredAwsTags;
}

export class DeclaredAwsIamOidcProvider
  extends DomainEntity<DeclaredAwsIamOidcProvider>
  implements DeclaredAwsIamOidcProvider
{
  public static primary = ['arn'] as const;
  public static unique = ['url'] as const;
  public static metadata = ['arn'] as const;
  public static readonly = [] as const;
  public static nested = { tags: DeclaredAwsTags };
}

/**
 * .what = placeholder thumbprint for oidc providers that don't need one
 * .why = aws api requires at least one thumbprint, but trusted providers (github, google, etc) ignore it
 * .note = filtered out on read to prevent permadiff
 */
export const OIDC_THUMBPRINT_PLACEHOLDER =
  '0000000000000000000000000000000000000000';
