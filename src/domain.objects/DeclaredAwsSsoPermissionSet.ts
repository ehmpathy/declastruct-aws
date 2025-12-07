import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsIamPolicyBundle } from './DeclaredAwsIamPolicyBundle';
import type { DeclaredAwsSsoInstance } from './DeclaredAwsSsoInstance';
import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure representing an AWS SSO Permission Set
 * .why = defines the level of access users get when assuming a role via sso
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [instance, name] — name is unique per identity center instance
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_PermissionSet.html
 */
export interface DeclaredAwsSsoPermissionSet {
  /**
   * .what = the arn of the permission set
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = reference to the identity center instance
   */
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;

  /**
   * .what = the name of the permission set
   * .constraint = 1-32 chars
   */
  name: string;

  /**
   * .what = description of the permission set
   */
  description: string | null;

  /**
   * .what = session duration in iso-8601 format
   * .default = 'PT1H'
   */
  sessionDuration?: string;

  /**
   * .what = the permissions bundle (managed + inline policies)
   */
  policy: DeclaredAwsIamPolicyBundle;

  /**
   * .what = tags for the permission set
   */
  tags: DeclaredAwsTags | null;
}

export class DeclaredAwsSsoPermissionSet
  extends DomainEntity<DeclaredAwsSsoPermissionSet>
  implements DeclaredAwsSsoPermissionSet
{
  public static primary = ['arn'] as const;
  public static unique = ['instance', 'name'] as const;
  public static metadata = ['arn'] as const;
  public static readonly = [] as const;
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsSsoInstance>,
    policy: DeclaredAwsIamPolicyBundle,
    tags: DeclaredAwsTags,
  };
}
