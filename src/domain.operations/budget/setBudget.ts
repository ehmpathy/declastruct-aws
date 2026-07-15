import {
  CreateBudgetCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateBudgetCommand,
} from '@aws-sdk/client-budgets';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsBudgetsClient } from '@src/access/sdks/getAwsBudgetsClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsBudget } from '@src/domain.objects/DeclaredAwsBudget';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

import { asBudgetArn } from './asBudgetArn';
import { castFromDeclaredAwsBudget } from './castFromDeclaredAwsBudget';
import { getOneBudget } from './getOneBudget';

/**
 * .what = creates or updates a budget idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant budget if the name already exists (no update)
 *   - upsert: updates the cap/period/filters + tags if it exists, else creates it
 */
export const setBudget = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsBudget;
      upsert: DeclaredAwsBudget;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsBudget>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (pinned to us-east-1)
    const client = getAwsBudgetsClient();
    const accountId = context.aws.credentials.account;
    const arn = asBudgetArn({ accountId, budgetName: desired.name });

    // check if the budget already exists
    const foundBefore = await getOneBudget(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant budget without update
    if (foundBefore && !isUpsert) return foundBefore;

    // upsert: update the extant budget in place
    if (foundBefore && isUpsert) {
      await client.send(
        new UpdateBudgetCommand({
          AccountId: accountId,
          NewBudget: castFromDeclaredAwsBudget(desired),
        }),
      );
      await syncTags({
        client,
        arn,
        tagsBefore: foundBefore.tags,
        tagsDesired: desired.tags,
      });
      return getOneAfter({ context, name: desired.name });
    }

    // create the budget
    await client.send(
      new CreateBudgetCommand({
        AccountId: accountId,
        Budget: castFromDeclaredAwsBudget(desired),
        ResourceTags: desired.tags
          ? Object.entries(desired.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      }),
    );

    return getOneAfter({ context, name: desired.name });
  },
);

/**
 * .what = re-reads the budget after a write and failfasts if absent
 */
const getOneAfter = async (input: {
  context: ContextAwsApi & VisualogicContext;
  name: string;
}): Promise<HasReadonly<typeof DeclaredAwsBudget>> => {
  const foundAfter = await getOneBudget(
    { by: { unique: { name: input.name } } },
    input.context,
  );
  if (!foundAfter)
    UnexpectedCodePathError.throw('budget not found after set', {
      name: input.name,
    });
  return foundAfter;
};

/**
 * .what = syncs tags via remove-old-then-add-new
 * .why = AWS has no single "set tags" call; drift reconciles by untag-then-tag
 */
const syncTags = async (input: {
  client: ReturnType<typeof getAwsBudgetsClient>;
  arn: string;
  tagsBefore: Record<string, string> | null;
  tagsDesired: Record<string, string> | null;
}): Promise<void> => {
  const { client, arn, tagsBefore, tagsDesired } = input;

  // remove old tags absent from desired
  const keysToRemove = getAllTagKeysToRemove({
    before: tagsBefore,
    desired: tagsDesired,
  });
  if (keysToRemove.length > 0)
    await client.send(
      new UntagResourceCommand({
        ResourceARN: arn,
        ResourceTagKeys: keysToRemove,
      }),
    );

  // add desired tags
  if (tagsDesired && Object.keys(tagsDesired).length > 0)
    await client.send(
      new TagResourceCommand({
        ResourceARN: arn,
        ResourceTags: Object.entries(tagsDesired).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      }),
    );
};
