import {
  DeletePermissionSetCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';

import { getOneSsoPermissionSet } from './getOneSsoPermissionSet';

/**
 * .what = deletes an sso permission set
 * .why = enables cleanup of permission sets
 *
 * .note
 *   - idempotent: no error if permission set doesn't exist
 *   - will fail if permission set is still assigned to accounts
 */
export const delSsoPermissionSet = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsSsoPermissionSet>;
      instanceArn: string;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // lookup permission set to get arn
    const permissionSet = await getOneSsoPermissionSet(
      { by: { ref: input.ref } },
      context,
    );

    // if doesn't exist, nothing to do (idempotent)
    if (!permissionSet) return;

    // delete the permission set
    try {
      await sso.send(
        new DeletePermissionSetCommand({
          InstanceArn: input.instanceArn,
          PermissionSetArn: permissionSet.arn,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'ResourceNotFoundException')
        return;
      throw error;
    }
  },
);
