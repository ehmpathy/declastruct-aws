import {
  ListTagsForResourceCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import type { RefByPrimary } from 'domain-objects';

import type { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';

/**
 * .what = fetches tags for an organization account
 * .why = tags are useful metadata for account management
 */
export const getOneOrganizationAccountTags = async (
  input: {
    by: { primary: RefByPrimary<typeof DeclaredAwsOrganizationAccount> };
  },
  context: { client: OrganizationsClient },
): Promise<Record<string, string> | null> => {
  const response = await context.client.send(
    new ListTagsForResourceCommand({ ResourceId: input.by.primary.id }),
  );
  if (!response.Tags || response.Tags.length === 0) return null;

  // convert tags array to record
  return response.Tags.reduce(
    (acc, tag) => {
      if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
      return acc;
    },
    {} as Record<string, string>,
  );
};
