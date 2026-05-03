import { DomainEntity } from 'domain-objects';

/**
 * .what = an enabled policy type in an aws organization
 * .why = policy types must be enabled before policies of that type can be created or attached
 *
 * .identity
 *   - @unique = [type] — only one instance per policy type per organization
 *
 * .note
 *   - this resource enables the policy type on the org root
 *   - required before create/attach of policies of this type
 *   - organization must have feature set = 'ALL' to enable policy types
 *
 * @see https://docs.aws.amazon.com/organizations/latest/APIReference/API_EnablePolicyType.html
 * @see https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_enable-disable.html
 */
export interface DeclaredAwsOrganizationPolicyEligibility {
  /**
   * .what = the type of policy to enable/disable
   * .constraint = valid policy type enum
   */
  type:
    | 'SERVICE_CONTROL_POLICY'
    | 'TAG_POLICY'
    | 'BACKUP_POLICY'
    | 'AISERVICES_OPT_OUT_POLICY';

  /**
   * .what = whether this policy type should be enabled or disabled
   */
  choice: 'ENABLED' | 'DISABLED';
}

export class DeclaredAwsOrganizationPolicyEligibility
  extends DomainEntity<DeclaredAwsOrganizationPolicyEligibility>
  implements DeclaredAwsOrganizationPolicyEligibility
{
  /**
   * .what = unique constraint — one instance per policy type
   * .note = no primary key since AWS doesn't assign an ID for enabled policy types
   */
  public static unique = ['type'] as const;

  /**
   * .what = no metadata fields — policy types don't get IDs or timestamps
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields
   */
  public static readonly = [] as const;
}
