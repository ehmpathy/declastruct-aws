import type { User } from '@aws-sdk/client-identitystore';
import {
  type HasReadonly,
  hasReadonly,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import type { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
import { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';

/**
 * .what = transforms aws sdk User to DeclaredAwsSsoUser
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsSsoUser = (input: {
  response: User;
  instance: RefByUnique<typeof DeclaredAwsSsoInstance>;
}): HasReadonly<typeof DeclaredAwsSsoUser> => {
  const { response, instance } = input;
  // failfast if user id missing
  if (!response.UserId)
    UnexpectedCodePathError.throw(
      'user lacks id; cannot cast to domain object',
      { response },
    );

  // failfast if username missing
  if (!response.UserName)
    UnexpectedCodePathError.throw(
      'user lacks userName; cannot cast to domain object',
      { response },
    );

  // extract primary email
  const primaryEmail = response.Emails?.find((e) => e.Primary)?.Value;
  if (!primaryEmail)
    UnexpectedCodePathError.throw(
      'user lacks primary email; cannot cast to domain object',
      { response },
    );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsSsoUser.as({
      id: response.UserId,
      instance,
      userName: response.UserName,
      displayName: response.DisplayName ?? response.UserName,
      email: primaryEmail,
      ...(response.Name?.GivenName !== undefined && {
        givenName: response.Name.GivenName,
      }),
      ...(response.Name?.FamilyName !== undefined && {
        familyName: response.Name.FamilyName,
      }),
    }),
    hasReadonly({ of: DeclaredAwsSsoUser }),
  );
};
