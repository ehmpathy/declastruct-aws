import { DomainEntity } from 'domain-objects';

/**
 * .what = a declarative structure for an AWS Account Alias
 * .why = enables human-readable account identification in console and sign-in URLs
 *
 * .identity
 *   - @primary = [alias] — the alias itself is the identifier
 *
 * .note
 *   - only one alias per account — singleton pattern
 *   - alias must be unique across all AWS accounts in the partition
 *   - no account reference — you can only manage your own account's alias
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html
 *
 * .usage
 *   const alias = await getOneAccountAlias({ by: { auth: true } }, context);
 *   // => { alias: 'ehmpathy-demo' } | null
 */
export interface DeclaredAwsAccountAlias {
  /**
   * .what = the account alias
   * .constraint
   *   - 3-63 characters
   *   - lowercase letters, numbers, and hyphens only
   *   - must start and end with alphanumeric
   *   - no consecutive hyphens
   *   - unique across all accounts in partition (aws, aws-cn, aws-us-gov)
   */
  alias: string;
}

export class DeclaredAwsAccountAlias
  extends DomainEntity<DeclaredAwsAccountAlias>
  implements DeclaredAwsAccountAlias
{
  /**
   * .what = primary key — the alias itself
   * .note = no AWS-assigned id; the alias is the identifier
   */
  public static primary = ['alias'] as const;
}
