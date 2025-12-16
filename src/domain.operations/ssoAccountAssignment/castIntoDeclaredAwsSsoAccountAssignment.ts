import type { AccountAssignment } from '@aws-sdk/client-sso-admin';
import {
  type HasReadonly,
  hasReadonly,
  type Ref,
  type RefByUnique,
} from 'domain-objects';
import { assure } from 'type-fns';

import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
import { DeclaredAwsSsoAccountAssignment } from '@src/domain.objects/DeclaredAwsSsoAccountAssignment';
import type { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
import type { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';

/**
 * .what = transforms aws sdk AccountAssignment to DeclaredAwsSsoAccountAssignment
 * .why = ensures type safety and readonly field enforcement
 *
 * .note = refs must be passed separately since AccountAssignment only has primary key identifiers
 */
export const castIntoDeclaredAwsSsoAccountAssignment = (input: {
  response: AccountAssignment;
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;
  permissionSet: RefByUnique<typeof DeclaredAwsSsoPermissionSet>;
  principal: RefByUnique<typeof DeclaredAwsSsoUser>;
  target: Ref<typeof DeclaredAwsOrganizationAccount>;
}): HasReadonly<typeof DeclaredAwsSsoAccountAssignment> => {
  const { response, instance, permissionSet, principal, target } = input;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsoAccountAssignment.as({
      instance,
      permissionSet,
      principalType: (response.PrincipalType as 'USER' | 'GROUP') ?? 'USER',
      principal,
      targetType: 'AWS_ACCOUNT',
      target,
    }),
    hasReadonly({ of: DeclaredAwsSsoAccountAssignment }),
  );
};
