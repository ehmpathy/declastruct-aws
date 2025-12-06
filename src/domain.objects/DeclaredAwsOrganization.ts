import { DomainEntity, RefByPrimary } from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';

/**
 * .what = the feature set enabled for the organization
 * .options
 *   - 'ALL' = full organization features including Service Control Policies (SCPs),
 *     tag policies, AI services opt-out policies, and backup policies.
 *     enables central governance and security controls across all member accounts.
 *   - 'CONSOLIDATED_BILLING' = billing-only mode. member accounts share a single
 *     payment method and receive volume discounts, but no policy controls.
 *     cannot be upgraded to 'ALL' without member account consent.
 */
export type OrganizationFeatureSet = 'ALL' | 'CONSOLIDATED_BILLING';

/**
 * .what = a declarative structure representing an AWS Organization
 * .why = enables referencing the organization that accounts belong to
 * .ref = https://docs.aws.amazon.com/organizations/latest/APIReference/API_Organization.html
 *
 * .identity
 *   - @primary = [id] — assigned by aws on creation
 *   - @unique = [managementAccount] — each account can only manage one org
 *
 * .note
 *   - an AWS account can only be the management account of ONE organization
 *   - an account can only belong to ONE organization at a time
 *
 * .usage
 *   const identity = await getOneIdentity({ by: { auth: true } }, context);
 *   const org = DeclaredAwsOrganization.as({
 *     managementAccount: { id: identity.account.id },
 *     ...
 *   });
 */
export interface DeclaredAwsOrganization {
  /**
   * .what = the unique identifier (ID) of the organization
   * .note = is @metadata — assigned by AWS on creation
   * .constraint = pattern: o-[a-z0-9]{10,32}
   */
  id?: string;

  /**
   * .what = the Amazon Resource Name (ARN) of the organization
   * .note = is @metadata — assigned by AWS on creation
   */
  arn?: string;

  /**
   * .what = the management account that owns this organization
   * .note
   *   - the account creating the org becomes the management account
   *   - 1:1 relationship (each account can only manage one org)
   *   - AWS API still uses legacy name "MasterAccountId" but docs call it "management account"
   *   - referenced by primary (id) for simpler declaration from identity
   */
  managementAccount: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;

  /**
   * .what = the feature set enabled for the organization
   * .note = ALL enables SCPs and other policies; CONSOLIDATED_BILLING is billing only
   * .default = 'ALL'
   */
  featureSet: OrganizationFeatureSet;
}

export class DeclaredAwsOrganization
  extends DomainEntity<DeclaredAwsOrganization>
  implements DeclaredAwsOrganization
{
  /**
   * .what = primary key — the organization ID (assigned by AWS)
   */
  public static primary = ['id'] as const;

  /**
   * .what = unique constraint — management account (1:1 with org)
   * .note = each account can only be management account of one org
   */
  public static unique = ['managementAccount'] as const;

  /**
   * .what = metadata fields assigned by AWS
   */
  public static metadata = ['id', 'arn'] as const;

  /**
   * .what = no readonly fields — all fields are either metadata or user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    managementAccount: RefByPrimary<typeof DeclaredAwsOrganizationAccount>,
  };
}
