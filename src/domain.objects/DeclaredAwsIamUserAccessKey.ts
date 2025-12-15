import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsIamUser } from './DeclaredAwsIamUser';

/**
 * .what = the status of an IAM access key
 */
export type IamAccessKeyStatus = 'Active' | 'Inactive';

/**
 * .what = a declarative structure representing an AWS IAM User Access Key
 * .why = enables declarative audit and cleanup of long-term credentials
 *
 * .identity
 *   - @primary = [accessKeyId] — unique key id assigned by aws (e.g., AKIAIOSFODNN7EXAMPLE)
 *   - @unique = n/a — no unique key, accessKeyId is the only identifier
 *
 * .note
 *   - max 2 access keys per user
 *   - secretAccessKey is only available at creation time (not retrievable)
 *   - status can be toggled between Active/Inactive
 *   - this domain object focuses on get/delete operations (not create)
 *   - access keys have been superseded by SSO and OIDC federation
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/APIReference/API_AccessKeyMetadata.html
 */
export interface DeclaredAwsIamUserAccessKey {
  /**
   * .what = the access key ID
   * .note = @primary @metadata — assigned by AWS on creation (e.g., AKIAIOSFODNN7EXAMPLE)
   * .constraint = 16-128 chars, prefix AKIA for permanent keys
   */
  accessKeyId?: string;

  /**
   * .what = reference to the IAM user who owns this key
   */
  user: RefByUnique<typeof DeclaredAwsIamUser>;

  /**
   * .what = the status of the access key
   * .note = can be toggled between Active/Inactive via UpdateAccessKey
   */
  status: IamAccessKeyStatus;

  /**
   * .what = when the access key was created
   * .note = is @readonly — derived from AWS source of truth
   */
  createDate?: UniDateTime;

  /**
   * .what = when the access key was last used
   * .note = is @readonly — derived from GetAccessKeyLastUsed, null if never used
   */
  lastUsedDate?: UniDateTime | null;

  /**
   * .what = the AWS service that was last accessed with this key
   * .note = is @readonly — derived from GetAccessKeyLastUsed, null if never used
   */
  lastUsedService?: string | null;

  /**
   * .what = the AWS region where the key was last used
   * .note = is @readonly — derived from GetAccessKeyLastUsed, null if never used
   */
  lastUsedRegion?: string | null;
}

export class DeclaredAwsIamUserAccessKey
  extends DomainEntity<DeclaredAwsIamUserAccessKey>
  implements DeclaredAwsIamUserAccessKey
{
  /**
   * .what = primary key assigned by AWS
   */
  public static primary = ['accessKeyId'] as const;

  /**
   * .what = no unique key — accessKeyId is the only identifier
   * .note = access keys don't support tags, so we can't persist an exid
   */
  // public static unique = [] as const; // intentionally omitted

  /**
   * .what = identity attributes assigned by AWS on creation
   */
  public static metadata = ['accessKeyId'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   */
  public static readonly = [
    'createDate',
    'lastUsedDate',
    'lastUsedService',
    'lastUsedRegion',
  ] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    user: RefByUnique<typeof DeclaredAwsIamUser>,
  };
}
