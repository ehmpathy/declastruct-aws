import {
  GetAccessKeyLastUsedCommand,
  IAMClient,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';
import type { HasReadonly, RefByPrimary, RefByUnique } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
import type { DeclaredAwsIamUserAccessKey } from '@src/domain.objects/DeclaredAwsIamUserAccessKey';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
import { getAllIamUsers } from '@src/domain.operations/iamUser/getAllIamUsers';

import { castIntoDeclaredAwsIamUserAccessKey } from './castIntoDeclaredAwsIamUserAccessKey';

/**
 * .what = retrieves all access keys for a user or all users in an account
 * .why = enables bulk listing for cleanup/audit purposes
 */
export const getAllIamUserAccessKeys = async (
  input: {
    by: PickOne<{
      user: RefByUnique<typeof DeclaredAwsIamUser>;
      account: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsIamUserAccessKey>[]> => {
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // determine which users to fetch keys for
  const users: RefByUnique<typeof DeclaredAwsIamUser>[] = input.by.user
    ? [input.by.user]
    : (
        await getAllIamUsers({ by: { account: input.by.account! } }, context)
      ).map((u) => ({ account: u.account, username: u.username }));

  // fetch access keys for each user
  const accessKeys: HasReadonly<typeof DeclaredAwsIamUserAccessKey>[] = [];

  try {
    for (const userRef of users) {
      // list access keys for this user
      const response = await iam.send(
        new ListAccessKeysCommand({ UserName: userRef.username }),
      );

      // enrich each key with last-used info
      for (const keyMeta of response.AccessKeyMetadata ?? []) {
        const lastUsedResponse = await iam.send(
          new GetAccessKeyLastUsedCommand({
            AccessKeyId: keyMeta.AccessKeyId,
          }),
        );

        accessKeys.push(
          castIntoDeclaredAwsIamUserAccessKey({
            accessKey: keyMeta,
            user: userRef,
            lastUsed: lastUsedResponse.AccessKeyLastUsed,
          }),
        );
      }
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new HelpfulError('aws.getAllIamUserAccessKeys error', {
      cause: error,
    });
  }

  return accessKeys;
};
