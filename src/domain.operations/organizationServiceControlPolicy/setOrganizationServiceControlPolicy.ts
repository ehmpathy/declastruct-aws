import {
  CreatePolicyCommand,
  OrganizationsClient,
  TagResourceCommand,
  UntagResourceCommand,
  UpdatePolicyCommand,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { castFromDeclaredAwsIamPolicyDocument } from '@src/domain.operations/iamRole/castFromDeclaredAwsIamPolicyDocument';

import { castIntoDeclaredAwsOrganizationServiceControlPolicy } from './castIntoDeclaredAwsOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicy } from './getOneOrganizationServiceControlPolicy';

/**
 * .what = creates or updates an SCP
 * .why = enables idempotent SCP management
 * .note
 *   - findsert: returns foundBefore if name already exists (no update)
 *   - upsert: updates if exists, creates if not
 *   - validates 5KB content limit
 */
export const setOrganizationServiceControlPolicy = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsOrganizationServiceControlPolicy;
      upsert: DeclaredAwsOrganizationServiceControlPolicy;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicy>
  > => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // serialize content for AWS API
    const contentJson = castFromDeclaredAwsIamPolicyDocument(desired.content);

    // validate 5KB limit
    const contentSize = new TextEncoder().encode(contentJson).length;
    if (contentSize > 5120)
      BadRequestError.throw('policy content exceeds 5KB limit', {
        size: contentSize,
        limit: 5120,
      });

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // check if already exists
    const foundBefore = await getOneOrganizationServiceControlPolicy(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return foundBefore if exists
    if (foundBefore && !isUpsert) return foundBefore;

    // upsert: update if exists
    if (foundBefore && isUpsert) {
      return updatePolicy({
        client,
        foundBefore,
        desired,
        contentJson,
        context,
      });
    }

    // create new policy
    try {
      const response = await client.send(
        new CreatePolicyCommand({
          Name: desired.name,
          Description: desired.description ?? undefined,
          Content: contentJson,
          Type: 'SERVICE_CONTROL_POLICY',
          Tags: desired.tags
            ? Object.entries(desired.tags).map(([Key, Value]) => ({
                Key,
                Value,
              }))
            : undefined,
        }),
      );

      if (!response.Policy)
        HelpfulError.throw('CreatePolicy did not return policy', { response });

      return castIntoDeclaredAwsOrganizationServiceControlPolicy({
        policy: response.Policy,
        tags: desired.tags
          ? Object.entries(desired.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already exists with same name (race condition)
      if (error.name === 'DuplicatePolicyException') {
        const foundAfter = await getOneOrganizationServiceControlPolicy(
          { by: { unique: { name: desired.name } } },
          context,
        );
        if (foundAfter) {
          if (isUpsert)
            return updatePolicy({
              client,
              foundBefore: foundAfter,
              desired,
              contentJson,
              context,
            });
          return foundAfter;
        }
      }

      throw new HelpfulError('aws.setOrganizationServiceControlPolicy error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
        },
      });
    }
  },
);

/**
 * .what = updates a policy's content, description, and tags
 */
const updatePolicy = async (input: {
  client: OrganizationsClient;
  foundBefore: HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicy>;
  desired: DeclaredAwsOrganizationServiceControlPolicy;
  contentJson: string;
  context: ContextAwsApi & VisualogicContext;
}): Promise<
  HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicy>
> => {
  const { client, foundBefore, desired, contentJson, context } = input;

  // update policy content and description
  const response = await client.send(
    new UpdatePolicyCommand({
      PolicyId: foundBefore.id,
      Name: desired.name,
      Description: desired.description ?? undefined,
      Content: contentJson,
    }),
  );

  if (!response.Policy)
    HelpfulError.throw('UpdatePolicy did not return policy', { response });

  // update tags
  await syncTags({
    client,
    policyId: foundBefore.id,
    tagsBefore: foundBefore.tags,
    tagsDesired: desired.tags,
  });

  // fetch updated policy
  const foundAfter = await getOneOrganizationServiceControlPolicy(
    { by: { primary: { id: foundBefore.id } } },
    context,
  );

  if (!foundAfter)
    HelpfulError.throw('policy not found after update', { input });

  return foundAfter;
};

/**
 * .what = syncs tags via remove old, add new
 */
const syncTags = async (input: {
  client: OrganizationsClient;
  policyId: string;
  tagsBefore: Record<string, string> | null;
  tagsDesired: Record<string, string> | null;
}): Promise<void> => {
  const { client, policyId, tagsBefore, tagsDesired } = input;

  // remove old tags not in desired
  const keysToRemove = Object.keys(tagsBefore ?? {}).filter(
    (key) => !tagsDesired || !(key in tagsDesired),
  );
  if (keysToRemove.length > 0) {
    await client.send(
      new UntagResourceCommand({
        ResourceId: policyId,
        TagKeys: keysToRemove,
      }),
    );
  }

  // add new tags
  if (tagsDesired && Object.keys(tagsDesired).length > 0) {
    await client.send(
      new TagResourceCommand({
        ResourceId: policyId,
        Tags: Object.entries(tagsDesired).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      }),
    );
  }
};
