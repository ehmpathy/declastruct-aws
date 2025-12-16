import {
  GetAccessKeyLastUsedCommand,
  IAMClient,
  ListAccessKeysCommand,
} from '@aws-sdk/client-iam';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { assure, isPresent, type PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamUser } from '@src/domain.objects/DeclaredAwsIamUser';
import type { DeclaredAwsIamUserAccessKey } from '@src/domain.objects/DeclaredAwsIamUserAccessKey';

import { castIntoDeclaredAwsIamUserAccessKey } from './castIntoDeclaredAwsIamUserAccessKey';

/**
 * .what = retrieves a single access key by primary or ref
 * .why = enables lookup before delete, and for enriching with lastUsed info
 *
 * .note = uses GetAccessKeyLastUsed to resolve UserName from accessKeyId
 */
export const getOneIamUserAccessKey = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsIamUserAccessKey>;
      ref: Ref<typeof DeclaredAwsIamUserAccessKey>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsIamUserAccessKey> | null> => {
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // normalize to accessKeyId (access keys have no unique key, so ref = primary)
  const accessKeyId = assure(
    input.by.primary?.accessKeyId ??
      (input.by.ref as RefByPrimary<typeof DeclaredAwsIamUserAccessKey>)
        ?.accessKeyId,
    isPresent,
  );

  try {
    // get last used info (also returns UserName)
    const lastUsedResponse = await iam.send(
      new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKeyId }),
    );

    // extract username from response
    const username = lastUsedResponse.UserName;
    if (!username) return null; // key doesn't exist

    // list keys for user to get full metadata
    const listResponse = await iam.send(
      new ListAccessKeysCommand({ UserName: username }),
    );

    const keyMeta = listResponse.AccessKeyMetadata?.find(
      (k) => k.AccessKeyId === accessKeyId,
    );
    if (!keyMeta) return null;

    // build user ref (need account from context)
    const userRef: RefByUnique<typeof DeclaredAwsIamUser> = {
      account: { id: context.aws.credentials.account },
      username,
    };

    return castIntoDeclaredAwsIamUserAccessKey({
      accessKey: keyMeta,
      user: userRef,
      lastUsed: lastUsedResponse.AccessKeyLastUsed,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // handle key not found (NoSuchEntity) or inaccessible (AccessDenied for fake key IDs)
    if (error.name === 'NoSuchEntityException' || error.name === 'AccessDenied')
      return null;

    throw new HelpfulError('aws.getOneIamUserAccessKey error', {
      cause: error,
    });
  }
};
