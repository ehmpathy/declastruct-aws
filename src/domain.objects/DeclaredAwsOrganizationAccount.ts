import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity, DomainLiteral, RefByPrimary } from 'domain-objects';

import type { DeclaredAwsOrganization } from './DeclaredAwsOrganization';

/**
 * .what = the state of an account in the organization lifecycle
 * .ref = https://docs.aws.amazon.com/organizations/latest/APIReference/API_Account.html
 */
export type OrganizationAccountState =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_CLOSURE'
  | 'CLOSED';

/**
 * .what = method by which the account joined the organization
 */
export type OrganizationAccountJoinedMethod = 'CREATED' | 'INVITED';

/**
 * .what = whether IAM users in the account can access billing
 */
export type IamUserAccessToBilling = 'ALLOW' | 'DENY';

/**
 * .what = a declarative structure representing an AWS Organization member account
 * .why = enables declarative provisioning of AWS accounts via declastruct
 * .ref = https://docs.aws.amazon.com/organizations/latest/APIReference/API_Account.html
 *
 * .identity
 *   - @primary = [id] — 12-digit account number assigned by aws on creation
 *   - @unique = [email] — globally unique across all AWS accounts
 *
 * .note
 *   - requires org manager auth to get/set
 *   - standalone accounts (not in org) are not supported by this domain object
 */
export interface DeclaredAwsOrganizationAccount {
  /**
   * .what = the unique identifier (ID) of the account
   * .note = is @metadata — assigned by AWS on creation
   * .constraint = exactly 12 digits
   */
  id?: string;

  /**
   * .what = the Amazon Resource Name (ARN) of the account
   * .note = is @metadata — assigned by AWS on creation
   */
  arn?: string;

  /**
   * .what = the organization this account belongs to
   */
  organization: RefByPrimary<typeof DeclaredAwsOrganization>;

  /**
   * .what = the friendly name of the account
   * .constraint = 1-50 chars, printable ASCII
   */
  name: string;

  /**
   * .what = the email address associated with the account
   * .constraint = 6-64 chars, unique across all AWS
   * .note = this is the unique identifier from user perspective
   */
  email: string;

  /**
   * .what = the current state of the account in its lifecycle
   * .note = is @readonly — derived from AWS source of truth
   */
  state?: OrganizationAccountState;

  /**
   * .what = method by which the account joined the organization
   * .note = is @readonly — derived from AWS source of truth
   */
  joinedMethod?: OrganizationAccountJoinedMethod;

  /**
   * .what = when the account joined the organization
   * .note = is @readonly — derived from AWS source of truth
   */
  joinedAt?: UniDateTime;

  /**
   * .what = whether IAM users can access billing information
   * .default = 'ALLOW'
   * .why = cost awareness is important; anyone using AWS resources should be cognizant of costs
   */
  iamUserAccessToBilling?: IamUserAccessToBilling;

  /**
   * .what = the name of the cross-account access role
   * .default = 'OrganizationAccountAccessRole'
   * .note = only settable at creation time
   */
  roleName?: string;

  /**
   * .what = tags to apply to the account
   */
  tags?: Record<string, string>;
}

export class DeclaredAwsOrganizationAccount
  extends DomainEntity<DeclaredAwsOrganizationAccount>
  implements DeclaredAwsOrganizationAccount
{
  /**
   * .what = primary key assigned by AWS
   * .note = id is the 12-digit account number
   */
  public static primary = ['id'] as const;

  /**
   * .what = unique constraint for user-specified identity
   * .note = email is globally unique across all AWS accounts
   */
  public static unique = ['email'] as const;

  /**
   * .what = identity attributes assigned by the persistence layer
   * .note = these are assigned by AWS on account creation
   */
  public static metadata = ['id', 'arn'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = these reflect the current state of the account
   */
  public static readonly = ['state', 'joinedMethod', 'joinedAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    organization: RefByPrimary<typeof DeclaredAwsOrganization>,
    tags: DomainLiteral,
  };
}
