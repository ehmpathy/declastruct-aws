import {
  DeleteInlinePolicyFromPermissionSetCommand,
  PutInlinePolicyToPermissionSetCommand,
  type SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { serialize } from 'domain-objects';

import type { DeclaredAwsIamPolicyDocument } from '@src/domain.objects/DeclaredAwsIamPolicyDocument';

/**
 * .what = updates inline policy on a permission set
 * .why = enables declarative management of custom inline policies
 *
 * .note
 *   - deletes inline policy if new is empty
 *   - puts new inline policy if changed
 *   - idempotent: no-op if policies match
 */
export const setSsoPermissionSetInlinePolicy = async (
  input: {
    for: { instanceArn: string; permissionSetArn: string };
    update: {
      from: DeclaredAwsIamPolicyDocument;
      into: DeclaredAwsIamPolicyDocument;
    };
  },
  context: { sso: SSOAdminClient },
): Promise<void> => {
  // skip if no changes
  const inlineBefore = serialize(input.update.from);
  const inlineDesired = serialize(input.update.into);
  if (inlineBefore === inlineDesired) return;

  // delete existing if new is empty
  if (input.update.into.statements.length === 0) {
    await context.sso.send(
      new DeleteInlinePolicyFromPermissionSetCommand({
        InstanceArn: input.for.instanceArn,
        PermissionSetArn: input.for.permissionSetArn,
      }),
    );
    return;
  }

  // convert domain format to aws format
  const awsPolicy = {
    Version: '2012-10-17',
    Statement: input.update.into.statements.map((stmt) => ({
      Sid: stmt.sid,
      Effect: stmt.effect,
      Principal: stmt.principal,
      Action: stmt.action,
      Resource: stmt.resource,
      Condition: stmt.condition,
    })),
  };

  // put the new inline policy
  await context.sso.send(
    new PutInlinePolicyToPermissionSetCommand({
      InstanceArn: input.for.instanceArn,
      PermissionSetArn: input.for.permissionSetArn,
      InlinePolicy: JSON.stringify(awsPolicy),
    }),
  );
};
