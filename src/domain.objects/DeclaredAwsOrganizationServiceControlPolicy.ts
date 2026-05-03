import { DomainEntity } from 'domain-objects';

import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = an aws organizations service control policy (SCP)
 * .why = defines org-level guardrails that apply to all principals in targeted accounts
 *
 * .identity
 *   - @primary = [id] — assigned by aws on creation
 *   - @unique = [name] — policy names are unique within the organization
 *
 * .note
 *   - SCPs set permission boundaries for principals in member accounts
 *   - even AdministratorAccess cannot bypass SCPs
 *   - the management account is exempt from SCPs
 *   - requires organization feature set = 'ALL' to use SCPs
 *   - content has 5KB max limit
 *
 * @see https://docs.aws.amazon.com/organizations/latest/APIReference/API_CreatePolicy.html
 * @see https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
 */
export interface DeclaredAwsOrganizationServiceControlPolicy {
  /**
   * .what = the unique identifier (ID) of the policy
   * .note = @metadata — assigned by aws on creation
   * .constraint = pattern: p-[a-z0-9]{8,128}
   */
  id?: string;

  /**
   * .what = the Amazon Resource Name (ARN) of the policy
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the friendly name of the policy
   * .note = @unique within the organization
   * .constraint = 1-128 chars, alphanumeric + _-.
   */
  name: string;

  /**
   * .what = optional description of the policy's purpose
   * .constraint = max 512 chars
   */
  description: string | null;

  /**
   * .what = the policy document with permission statements
   * .constraint = max 5KB (5120 bytes) when serialized as JSON
   */
  content: DeclaredAwsIamPolicyDocument;

  /**
   * .what = optional tags for the policy
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsOrganizationServiceControlPolicy
  extends DomainEntity<DeclaredAwsOrganizationServiceControlPolicy>
  implements DeclaredAwsOrganizationServiceControlPolicy
{
  /**
   * .what = primary key — the policy ID (assigned by AWS)
   */
  public static primary = ['id'] as const;

  /**
   * .what = unique constraint — policy name is unique within organization
   */
  public static unique = ['name'] as const;

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
    content: DeclaredAwsIamPolicyDocument,
    tags: DeclaredAwsTags,
  };
}
