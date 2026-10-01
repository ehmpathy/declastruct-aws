import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  DeleteAccessKeyCommand,
  DeleteUserCommand,
  IAMClient,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { getAwsClientConfig } from '@src/access/sdks/getAwsClientConfig';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = the name prefix every throwaway test user must carry
 * .why = the demo role's iam:CreateUser/DeleteUser grant is scoped to this prefix
 *   (`provision/aws.auth/resources.common.ts`), so a user outside it cannot be minted or removed
 */
export const TEST_IAM_USER_PREFIX = 'declastruct-test-';

const getIamClient = (context: ContextAwsApi): IAMClient =>
  new IAMClient(getAwsClientConfig({ region: context.aws.credentials.region }));

/**
 * .what = removes a throwaway test user and every access key it holds
 * .why = both-ends cleanup for the iam lookup tests; aws refuses DeleteUser while keys remain
 * .note = idempotent — an absent user (NoSuchEntityException) is already the desired state
 */
export const delTestIamUserThrowaway = async (
  input: { name: string },
  context: ContextAwsApi,
): Promise<void> => {
  const iam = getIamClient(context);
  try {
    const listed = await iam.send(
      new ListAccessKeysCommand({ UserName: input.name }),
    );
    for (const key of listed.AccessKeyMetadata ?? [])
      await iam.send(
        new DeleteAccessKeyCommand({
          UserName: input.name,
          AccessKeyId: key.AccessKeyId,
        }),
      );
    await iam.send(new DeleteUserCommand({ UserName: input.name }));
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchEntityException')
      return;
    throw error;
  }
};

/**
 * .what = creates a throwaway iam user (and optionally one access key) for a lookup test
 * .why = the demo account holds no iam users or keys, so without a fixture the lookup tests
 *   have no subject and prove no behavior. each test mints its own and removes it after
 * .note
 *   - the access key's SECRET is discarded at once and never returned or logged — a lookup test
 *     needs only the key id
 *   - the caller must pair this with `delTestIamUserThrowaway` both before and after
 */
export const setTestIamUserThrowaway = async (
  input: { name: string; withAccessKey: boolean },
  context: ContextAwsApi,
): Promise<{
  username: string;
  userId: string;
  accessKeyId: string | null;
}> => {
  if (!input.name.startsWith(TEST_IAM_USER_PREFIX))
    BadRequestError.throw(
      `a throwaway test user name must start with "${TEST_IAM_USER_PREFIX}" — the create grant is scoped to it`,
      { name: input.name },
    );

  const iam = getIamClient(context);
  const createdUser = await iam.send(
    new CreateUserCommand({
      UserName: input.name,
      Tags: [
        { Key: 'managedBy', Value: 'declastruct' },
        { Key: 'purpose', Value: 'integration-test' },
      ],
    }),
  );
  // aws's own id for the user, from the create — an independent source a lookup can be checked against
  const userId =
    createdUser.User?.UserId ??
    UnexpectedCodePathError.throw('CreateUser returned no user id', {
      name: input.name,
    });
  if (!input.withAccessKey)
    return { username: input.name, userId, accessKeyId: null };

  // keep the id, drop the secret
  const created = await iam.send(
    new CreateAccessKeyCommand({ UserName: input.name }),
  );
  const accessKeyId =
    created.AccessKey?.AccessKeyId ??
    UnexpectedCodePathError.throw('CreateAccessKey returned no key id', {
      name: input.name,
    });
  return { username: input.name, userId, accessKeyId };
};
