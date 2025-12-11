import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsSsoInstance } from './DeclaredAwsSsoInstance';

/**
 * .what = a declarative structure representing an AWS Identity Center User
 * .why = enables creating users for sso-based access
 *
 * .identity
 *   - @primary = [id] — assigned by aws on creation
 *   - @unique = [identityStoreId, userName] — userName is unique per identity store
 *
 * .ref = https://docs.aws.amazon.com/singlesignon/latest/IdentityStoreAPIReference/API_User.html
 */
export interface DeclaredAwsSsoUser {
  /**
   * .what = the unique user id
   * .note = @metadata — assigned by aws on creation
   */
  id?: string;

  /**
   * .what = reference to the identity center instance this user belongs to
   */
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;

  /**
   * .what = the unique username
   * .constraint = max 128 chars
   */
  userName: string;

  /**
   * .what = display name for the user
   */
  displayName: string;

  /**
   * .what = given (first) name
   */
  givenName?: string;

  /**
   * .what = family (last) name
   */
  familyName?: string;

  /**
   * .what = primary email address
   */
  email: string;
}

export class DeclaredAwsSsoUser
  extends DomainEntity<DeclaredAwsSsoUser>
  implements DeclaredAwsSsoUser
{
  public static primary = ['id'] as const;
  public static unique = ['instance', 'userName'] as const;
  public static metadata = ['id'] as const;
  public static readonly = [] as const;
  public static nested = {
    instance: RefByUnique<typeof DeclaredAwsSsoInstance>,
  };
}
