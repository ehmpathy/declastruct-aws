import {
  type SSOAdminClient,
  UpdatePermissionSetCommand,
} from '@aws-sdk/client-sso-admin';

import type { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';

/**
 * .what = updates basic properties (description, session duration) on a permission set
 * .why = enables declarative management of permission set properties
 *
 * .note
 *   - only updates if properties have changed
 *   - idempotent: no-op if properties match
 */
export const setSsoPermissionSetBasicProperties = async (
  input: {
    for: { instanceArn: string; permissionSetArn: string };
    update: {
      from: Pick<
        DeclaredAwsSsoPermissionSet,
        'description' | 'sessionDuration'
      >;
      into: Pick<
        DeclaredAwsSsoPermissionSet,
        'description' | 'sessionDuration'
      >;
    };
  },
  context: { sso: SSOAdminClient },
): Promise<void> => {
  // skip if no changes
  const hasChanged =
    input.update.from.description !== input.update.into.description ||
    input.update.from.sessionDuration !== input.update.into.sessionDuration;
  if (!hasChanged) return;

  // update permission set properties
  await context.sso.send(
    new UpdatePermissionSetCommand({
      InstanceArn: input.for.instanceArn,
      PermissionSetArn: input.for.permissionSetArn,
      Description: input.update.into.description ?? undefined,
      SessionDuration: input.update.into.sessionDuration,
    }),
  );
};
