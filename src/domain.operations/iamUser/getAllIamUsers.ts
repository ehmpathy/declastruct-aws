import { IAMClient, ListUsersCommand, type User } from '@aws-sdk/client-iam';
import type { HasReadonly, RefByPrimary } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';

import { castIntoDeclaredAwsIamUser } from './castIntoDeclaredAwsIamUser';

/**
 * .what = retrieves all IAM users in an account
 * .why = enables listing users to then fetch their access keys
 */
export const getAllIamUsers = async (
  input: {
    by: { account: RefByPrimary<typeof DeclaredAwsOrganizationAccount> };
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsIamUser>[]> => {
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // paginate through all users
  const users: User[] = [];
  let marker: string | undefined;

  try {
    do {
      const response = await iam.send(new ListUsersCommand({ Marker: marker }));
      users.push(...(response.Users ?? []));
      marker = response.Marker;
    } while (marker);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new HelpfulError('aws.getAllIamUsers error', { cause: error });
  }

  // cast each user
  return users.map((user) =>
    castIntoDeclaredAwsIamUser({ user, account: input.by.account }),
  );
};
