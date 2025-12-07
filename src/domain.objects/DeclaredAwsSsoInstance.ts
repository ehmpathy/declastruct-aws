import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity, RefByPrimary } from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';

/**
 * .what = the current status of an SSO Identity Center instance
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_InstanceMetadata.html
 */
export type SsoInstanceStatus =
  | 'CREATE_IN_PROGRESS'
  | 'CREATE_FAILED'
  | 'DELETE_IN_PROGRESS'
  | 'ACTIVE';

/**
 * .what = a declarative structure representing an AWS SSO Identity Center Instance
 * .why = anchors sso resources (users, permission sets, assignments) to the identity center
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [ownerAccount] — one instance per organization/account
 *
 * .note
 *   - identity center instances cannot be created via api; must be enabled in console
 *   - there is exactly one instance per aws organization
 *   - the identityStoreId is automatically provisioned with the instance
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_InstanceMetadata.html
 */
export interface DeclaredAwsSsoInstance {
  /**
   * .what = the arn of the identity center instance
   * .note = @metadata — assigned by aws on creation
   * .constraint = pattern: arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}
   */
  arn?: string;

  /**
   * .what = the identifier of the identity store connected to this instance
   * .note = @metadata — automatically provisioned with the instance
   * .constraint = 1-64 chars, pattern: [a-zA-Z0-9-]*
   */
  identityStoreId?: string;

  /**
   * .what = the aws account that owns this identity center instance
   * .note = this is the unique identifier from user perspective (one instance per account/org)
   */
  ownerAccount: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;

  /**
   * .what = the name of the identity center instance
   * .note = @readonly — null if not named by aws
   * .constraint = 0-255 chars
   */
  name?: string | null;

  /**
   * .what = the current status of the instance
   * .note = @readonly — always provided by aws
   */
  status?: SsoInstanceStatus;

  /**
   * .what = additional context about the current status
   * .note = @readonly — null when no reason provided (e.g., when ACTIVE)
   */
  statusReason?: string | null;

  /**
   * .what = when the identity center instance was created
   * .note = @readonly — always provided by aws
   */
  createdAt?: UniDateTime;
}

export class DeclaredAwsSsoInstance
  extends DomainEntity<DeclaredAwsSsoInstance>
  implements DeclaredAwsSsoInstance
{
  /**
   * .what = primary key assigned by aws
   * .note = arn uniquely identifies the instance
   */
  public static primary = ['arn'] as const;

  /**
   * .what = unique constraint for user-specified identity
   * .note = one instance per ownerAccount (organization)
   */
  public static unique = ['ownerAccount'] as const;

  /**
   * .what = identity attributes assigned by aws on creation
   */
  public static metadata = ['arn', 'identityStoreId'] as const;

  /**
   * .what = intrinsic attributes resolved from aws, not user-settable
   */
  public static readonly = ['status', 'statusReason', 'createdAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    ownerAccount: RefByPrimary<typeof DeclaredAwsOrganizationAccount>,
  };
}
