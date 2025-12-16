import type { User } from '@aws-sdk/client-iam';
import { isUniDateTime } from '@ehmpathy/uni-time';
import {
  type HasReadonly,
  hasReadonly,
  type RefByPrimary,
} from 'domain-objects';
import { assure, isPresent } from 'type-fns';

import { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';

/**
 * .what = transforms AWS SDK User into DeclaredAwsIamUser
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsIamUser = (input: {
  user: User;
  account: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;
}): HasReadonly<typeof DeclaredAwsIamUser> => {
  // parse createDate (required readonly)
  const createDate = isUniDateTime.assure(
    assure(input.user.CreateDate, isPresent).toISOString(),
  );

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsIamUser.as({
      id: assure(input.user.UserId, isPresent),
      arn: assure(input.user.Arn, isPresent),
      account: input.account,
      username: assure(input.user.UserName, isPresent),
      path: input.user.Path,
      createDate,
    }),
    hasReadonly({ of: DeclaredAwsIamUser }),
  );
};
