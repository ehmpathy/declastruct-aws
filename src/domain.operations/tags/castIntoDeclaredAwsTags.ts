import type { Tag } from '@aws-sdk/client-sso-admin';

import type { DeclaredAwsTags } from '@src/domain.objects/DeclaredAwsTags';

/**
 * .what = parses AWS tags to domain format
 */
export const castIntoDeclaredAwsTags = (
  tags: Tag[] | undefined,
): DeclaredAwsTags | null => {
  const result = tags?.reduce((acc, tag) => {
    if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
    return acc;
  }, {} as DeclaredAwsTags);
  if (!result) return null;
  return Object.keys(result).length > 0 ? result : null;
};
