import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsIamRole } from './DeclaredAwsIamRole';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = an IAM instance profile for EC2 instances
 * .why = enables EC2 instances to assume IAM roles for AWS API access
 *
 * .note
 *   - instance profiles are containers for IAM roles
 *   - EC2 instances can only use roles via instance profiles
 *   - required for SSM, CloudWatch, and other AWS service integrations
 */
export interface DeclaredAwsIamInstanceProfile {
  /**
   * .what = the instance profile name
   * .note = must be unique within the account
   */
  name: string;

  /**
   * .what = the IAM role to associate with this profile
   * .note = only one role per profile
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * .what = the path for the instance profile
   * .note = defaults to '/'
   */
  path?: string;

  /**
   * .what = AWS tags
   */
  tags?: DeclaredAwsTags | null;
}

export class DeclaredAwsIamInstanceProfile
  extends DomainEntity<DeclaredAwsIamInstanceProfile>
  implements DeclaredAwsIamInstanceProfile
{
  /**
   * .what = unique by name
   */
  public static unique = ['name'] as const;

  /**
   * .what = no metadata — instance profiles have no aws-assigned identity we track
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    role: RefByUnique,
    tags: DeclaredAwsTags,
  };
}
