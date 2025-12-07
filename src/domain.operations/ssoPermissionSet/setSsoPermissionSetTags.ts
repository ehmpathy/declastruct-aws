import {
  type SSOAdminClient,
  TagResourceCommand,
  UntagResourceCommand,
} from '@aws-sdk/client-sso-admin';

/**
 * .what = updates tags on a permission set
 * .why = enables declarative management of permission set tags
 *
 * .note
 *   - removes tags that are no longer desired
 *   - adds/updates tags that have changed
 *   - idempotent: no-op if tags match
 */
export const setSsoPermissionSetTags = async (
  input: {
    for: { instanceArn: string; permissionSetArn: string };
    update: {
      from: Record<string, string>;
      into: Record<string, string>;
    };
  },
  context: { sso: SSOAdminClient },
): Promise<void> => {
  // remove tags that are no longer desired
  const tagsToRemove = Object.keys(input.update.from).filter(
    (key) => !(key in input.update.into),
  );
  if (tagsToRemove.length > 0) {
    await context.sso.send(
      new UntagResourceCommand({
        InstanceArn: input.for.instanceArn,
        ResourceArn: input.for.permissionSetArn,
        TagKeys: tagsToRemove,
      }),
    );
  }

  // add/update tags
  const tagsToSet = Object.entries(input.update.into).filter(
    ([key, value]) => input.update.from[key] !== value,
  );
  if (tagsToSet.length > 0) {
    await context.sso.send(
      new TagResourceCommand({
        InstanceArn: input.for.instanceArn,
        ResourceArn: input.for.permissionSetArn,
        Tags: tagsToSet.map(([key, value]) => ({ Key: key, Value: value })),
      }),
    );
  }
};
