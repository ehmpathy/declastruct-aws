import {
  CreateAnomalySubscriptionCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateAnomalySubscriptionCommand,
} from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';
import { getOneCostAnomalyMonitor } from '@src/domain.operations/costAnomalyMonitor/getOneCostAnomalyMonitor';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

import { castFromDeclaredAwsCostAnomalySubscription } from './castFromDeclaredAwsCostAnomalySubscription';
import { getOneCostAnomalySubscription } from './getOneCostAnomalySubscription';

/**
 * .what = creates or updates a cost anomaly subscription idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant subscription if the name already exists (no
 *     update)
 *   - upsert: updates the frequency/threshold/subscribers if it exists, else
 *     creates it
 *   - the monitor name-ref is turned into a MonitorArn via getOneCostAnomalyMonitor
 *     before the write; the monitor must be extant first
 */
export const setCostAnomalySubscription = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsCostAnomalySubscription;
      upsert: DeclaredAwsCostAnomalySubscription;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostAnomalySubscription>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    // check if the subscription already exists
    const foundBefore = await getOneCostAnomalySubscription(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant subscription without update
    if (foundBefore && !isUpsert) return foundBefore;

    // turn the monitor name-ref into a MonitorArn (needed for create + upsert)
    const monitor = await getOneCostAnomalyMonitor(
      { by: { unique: { name: desired.monitor.name } } },
      context,
    );
    const monitorArn =
      monitor?.arn ??
      BadRequestError.throw(
        'the referenced cost anomaly monitor is absent; create it first',
        { monitor: desired.monitor },
      );

    // upsert: update the extant subscription in place
    if (foundBefore && isUpsert) {
      const arn =
        foundBefore.arn ??
        UnexpectedCodePathError.throw('extant subscription lacks an arn', {
          foundBefore,
        });
      const encoded = castFromDeclaredAwsCostAnomalySubscription({
        desired,
        monitorArn,
      });
      await client.send(
        new UpdateAnomalySubscriptionCommand({
          SubscriptionArn: arn,
          Frequency: encoded.Frequency,
          MonitorArnList: encoded.MonitorArnList,
          Subscribers: encoded.Subscribers,
          ThresholdExpression: encoded.ThresholdExpression,
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

    // create the subscription
    await client.send(
      new CreateAnomalySubscriptionCommand({
        AnomalySubscription: castFromDeclaredAwsCostAnomalySubscription({
          desired,
          monitorArn,
        }),
        ResourceTags: desired.tags
          ? Object.entries(desired.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      }),
    );

    return getOneAfter({ context, name: desired.name });
  },
);

/**
 * .what = re-reads the subscription after a write and failfasts if absent
 */
const getOneAfter = async (input: {
  context: ContextAwsApi & VisualogicContext;
  name: string;
}): Promise<HasReadonly<typeof DeclaredAwsCostAnomalySubscription>> => {
  const foundAfter = await getOneCostAnomalySubscription(
    { by: { unique: { name: input.name } } },
    input.context,
  );
  if (!foundAfter)
    UnexpectedCodePathError.throw('subscription not found after set', {
      name: input.name,
    });
  return foundAfter;
};

/**
 * .what = syncs tags via remove-old-then-add-new
 * .why = UpdateAnomalySubscription does not reconcile tags; drift reconciles by
 *        untag-then-tag, keyed by the subscription arn
 */
const syncTags = async (input: {
  client: ReturnType<typeof getAwsCostExplorerClient>;
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
        ResourceArn: arn,
        ResourceTagKeys: keysToRemove,
      }),
    );

  // add desired tags
  if (tagsDesired && Object.keys(tagsDesired).length > 0)
    await client.send(
      new TagResourceCommand({
        ResourceArn: arn,
        ResourceTags: Object.entries(tagsDesired).map(([Key, Value]) => ({
          Key,
          Value,
        })),
      }),
    );
};
