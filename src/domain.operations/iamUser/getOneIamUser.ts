import { GetUserCommand, IAMClient } from '@aws-sdk/client-iam';
import {
  type HasReadonly,
  isRefByPrimary,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';

import { castIntoDeclaredAwsIamUser } from './castIntoDeclaredAwsIamUser';

/**
 * .what = retrieves a single IAM user by primary or unique
 * .why = enables lookup for operations that need a specific user
 */
export const getOneIamUser = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsIamUser>;
      unique: RefByUnique<typeof DeclaredAwsIamUser>;
      ref: Ref<typeof DeclaredAwsIamUser>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsIamUser> | null> => {
  // handle by ref
  if (input.by.ref) {
    const ref = input.by.ref;
    if (isRefByPrimary({ of: DeclaredAwsIamUser })(ref))
      return getOneIamUser({ by: { primary: ref } }, context);
    return getOneIamUser({ by: { unique: ref } }, context);
  }

  // handle by primary (id) - requires getting all users to find by id
  if (input.by.primary) {
    // note: AWS IAM doesn't have a GetUserById API, only GetUser by username
    // we'd need to list all users and filter, which is expensive
    // for now, throw an error suggesting to use unique instead
    UnexpectedCodePathError.throw(
      'getOneIamUser by primary (id) is not efficiently supported by AWS IAM API. use by.unique (account + username) instead.',
      { input },
    );
  }

  // handle by unique (account + username)
  if (input.by.unique) {
    const iam = new IAMClient({ region: context.aws.credentials.region });

    try {
      const response = await iam.send(
        new GetUserCommand({ UserName: input.by.unique.username }),
      );

      if (!response.User) return null;

      return castIntoDeclaredAwsIamUser({
        user: response.User,
        account: input.by.unique.account,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle user not found
      if (error.name === 'NoSuchEntityException') return null;

      throw new HelpfulError('aws.getOneIamUser error', { cause: error });
    }
  }

  // unexpected input
  UnexpectedCodePathError.throw('invalid input', { input });
};
