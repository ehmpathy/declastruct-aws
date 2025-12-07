import {
  AttachManagedPolicyToPermissionSetCommand,
  DetachManagedPolicyFromPermissionSetCommand,
  type SSOAdminClient,
} from '@aws-sdk/client-sso-admin';

/**
 * .what = updates managed policies attached to a permission set
 * .why = enables declarative management of permission set policies
 *
 * .note
 *   - detaches policies that are no longer desired
 *   - attaches new policies that weren't there before
 *   - idempotent: no-op if policies match
 */
export const setSsoPermissionSetManagedPolicies = async (
  input: {
    for: { instanceArn: string; permissionSetArn: string };
    update: {
      from: string[];
      into: string[];
    };
  },
  context: { sso: SSOAdminClient },
): Promise<void> => {
  // build sets for comparison
  const managedBefore = new Set(input.update.from);
  const managedDesired = new Set(input.update.into);

  // detach removed policies
  for (const policyArn of managedBefore) {
    if (!managedDesired.has(policyArn)) {
      await context.sso.send(
        new DetachManagedPolicyFromPermissionSetCommand({
          InstanceArn: input.for.instanceArn,
          PermissionSetArn: input.for.permissionSetArn,
          ManagedPolicyArn: policyArn,
        }),
      );
    }
  }

  // attach new policies
  for (const policyArn of managedDesired) {
    if (!managedBefore.has(policyArn)) {
      await context.sso.send(
        new AttachManagedPolicyToPermissionSetCommand({
          InstanceArn: input.for.instanceArn,
          PermissionSetArn: input.for.permissionSetArn,
          ManagedPolicyArn: policyArn,
        }),
      );
    }
  }
};
