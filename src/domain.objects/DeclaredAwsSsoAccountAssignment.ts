import { DomainEntity, Ref, RefByUnique } from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsSsoInstance } from './DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from './DeclaredAwsSsoPermissionSet';
import type { DeclaredAwsSsoUser } from './DeclaredAwsSsoUser';

/**
 * .what = a declarative structure representing an SSO Account Assignment
 * .why = links a user/group to an account via a permission set
 *
 * .identity
 *   - @unique = composite key of all fields (the actual unique identifier in aws)
 *
 * .note
 *   - aws does not assign a single id to account assignments
 *   - assignments are identified by their full composite key
 *   - no primary key - byPrimary lookups are not supported
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_CreateAccountAssignment.html
 */
export interface DeclaredAwsSsoAccountAssignment {
  /**
   * .what = reference to the identity center instance
   */
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;

  /**
   * .what = reference to the permission set defining access level
   */
  permissionSet: RefByUnique<typeof DeclaredAwsSsoPermissionSet>;

  /**
   * .what = type of principal being assigned
   */
  principalType: 'USER' | 'GROUP';

  /**
   * .what = reference to the user or group
   */
  principal: RefByUnique<typeof DeclaredAwsSsoUser>; // or DeclaredAwsSsoGroup when supported

  /**
   * .what = type of target (always AWS_ACCOUNT for account assignments)
   */
  targetType: 'AWS_ACCOUNT';

  /**
   * .what = reference to the target account
   * .note = supports both RefByUnique (email) and RefByPrimary (id)
   */
  target: Ref<typeof DeclaredAwsOrganizationAccount>;
}

export class DeclaredAwsSsoAccountAssignment
  extends DomainEntity<DeclaredAwsSsoAccountAssignment>
  implements DeclaredAwsSsoAccountAssignment
{
  /**
   * .what = composite unique key (the actual identifier in aws)
   * .note = the full combination of these fields uniquely identifies an assignment
   */
  public static unique = [
    'instance',
    'permissionSet',
    'principalType',
    'principal',
    'targetType',
    'target',
  ] as const;

  public static metadata = [] as const;
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions for refs
   */
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsSsoInstance>,
    permissionSet: RefByUnique<typeof DeclaredAwsSsoPermissionSet>,
    principal: RefByUnique<typeof DeclaredAwsSsoUser>,
    target: Ref<typeof DeclaredAwsOrganizationAccount>,
  };
}
