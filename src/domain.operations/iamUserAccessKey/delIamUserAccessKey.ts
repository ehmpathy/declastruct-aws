import {
  DeleteAccessKeyCommand,
  GetAccessKeyLastUsedCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import type { Ref, RefByPrimary } from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { assure, isPresent, type PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamUserAccessKey } from '../../domain.objects/DeclaredAwsIamUserAccessKey';

/**
 * .what = deletes an access key
 * .why = enables cleanup of old/compromised keys
 *
 * .note = idempotent: returns success if key already deleted
 */
export const delIamUserAccessKey = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsIamUserAccessKey>;
      ref: Ref<typeof DeclaredAwsIamUserAccessKey>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<{ deleted: true }> => {
  const iam = new IAMClient({ region: context.aws.credentials.region });

  // normalize to accessKeyId (access keys have no unique key, so ref = primary)
  const accessKeyId = assure(
    input.by.primary?.accessKeyId ??
      (input.by.ref as RefByPrimary<typeof DeclaredAwsIamUserAccessKey>)
        ?.accessKeyId,
    isPresent,
  );

  try {
    // resolve username from accessKeyId
    const lastUsedResponse = await iam.send(
      new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKeyId }),
    );
    const username = lastUsedResponse.UserName;

    // idempotent: if key doesn't exist, return success
    if (!username) return { deleted: true };

    // delete the key
    await iam.send(
      new DeleteAccessKeyCommand({
        UserName: username,
        AccessKeyId: accessKeyId,
      }),
    );

    return { deleted: true };
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // idempotent: ignore if already deleted
    if (error.name === 'NoSuchEntityException') return { deleted: true };

    throw new HelpfulError('aws.delIamUserAccessKey error', { cause: error });
  }
};
