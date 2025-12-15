import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity, RefByPrimary } from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';

/**
 * .what = a declarative structure representing an AWS IAM User
 * .why = enables referencing the owner of access keys for audit and purge
 *
 * .identity
 *   - @primary = [id] — unique user id assigned by aws (e.g., AIDAIOSFODNN7EXAMPLE)
 *   - @unique = [account, username] — username is unique per account
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/APIReference/API_User.html
 */
export interface DeclaredAwsIamUser {
  /**
   * .what = the unique identifier (ID) of the user
   * .note = is @metadata — assigned by AWS on creation (e.g., AIDAIOSFODNN7EXAMPLE)
   */
  id?: string;

  /**
   * .what = the Amazon Resource Name (ARN) of the user
   * .note = is @metadata — assigned by AWS on creation
   */
  arn?: string;

  /**
   * .what = the account this user belongs to
   */
  account: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;

  /**
   * .what = the friendly name identifying the user
   * .constraint = 1-64 chars
   */
  username: string;

  /**
   * .what = the path to the user
   * .default = '/'
   */
  path?: string;

  /**
   * .what = when the user was created
   * .note = is @readonly — derived from AWS source of truth
   */
  createDate?: UniDateTime;
}

export class DeclaredAwsIamUser
  extends DomainEntity<DeclaredAwsIamUser>
  implements DeclaredAwsIamUser
{
  /**
   * .what = primary key assigned by AWS
   */
  public static primary = ['id'] as const;

  /**
   * .what = unique constraint — username is unique within an account
   */
  public static unique = ['account', 'username'] as const;

  /**
   * .what = identity attributes assigned by AWS on creation
   */
  public static metadata = ['id', 'arn'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = ['createDate'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    account: RefByPrimary<typeof DeclaredAwsOrganizationAccount>,
  };
}
