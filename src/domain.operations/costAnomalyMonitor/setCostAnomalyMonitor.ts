import {
  CreateAnomalyMonitorCommand,
  TagResourceCommand,
  UntagResourceCommand,
  UpdateAnomalyMonitorCommand,
} from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { getAllTagKeysToRemove } from '@src/domain.operations/tags/getAllTagKeysToRemove';

import { getOneCostAnomalyMonitor } from './getOneCostAnomalyMonitor';

/**
 * .what = creates or updates a cost anomaly monitor idempotently
 * .why = enables declarative plan/apply with a cheap re-apply
 * .note
 *   - findsert: returns the extant monitor if the name already exists (no update)
 *   - upsert: updates the name + tags if it exists, else creates it
 *   - AWS does not allow a monitor's type/dimension to change in place, so upsert
 *     only reconciles the name (via MonitorArn) and the tags
 */
export const setCostAnomalyMonitor = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsCostAnomalyMonitor;
      upsert: DeclaredAwsCostAnomalyMonitor;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostAnomalyMonitor>> => {
    const desired = input.findsert ?? input.upsert;
    const isUpsert = !!input.upsert;

    // failfast if no input
    if (!desired) BadRequestError.throw('findsert or upsert is required');

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    // check if the monitor already exists
    const foundBefore = await getOneCostAnomalyMonitor(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant monitor without update
    if (foundBefore && !isUpsert) return foundBefore;

    // upsert: update the extant monitor in place
    if (foundBefore && isUpsert) {
      const arn =
        foundBefore.arn ??
        UnexpectedCodePathError.throw('extant monitor lacks an arn', {
          foundBefore,
        });
      await client.send(
        new UpdateAnomalyMonitorCommand({
          MonitorArn: arn,
          MonitorName: desired.name,
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

    // create the monitor
    await client.send(
      new CreateAnomalyMonitorCommand({
        AnomalyMonitor: {
          MonitorName: desired.name,
          MonitorType: desired.kind,
          MonitorDimension: desired.dimension ?? undefined,
        },
        ResourceTags: desired.tags
          ? Object.entries(desired.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      }),
    );

    return getOneAfter({ context, name: desired.name });
  },
);

/**
 * .what = re-reads the monitor after a write and failfasts if absent
 */
const getOneAfter = async (input: {
  context: ContextAwsApi & VisualogicContext;
  name: string;
}): Promise<HasReadonly<typeof DeclaredAwsCostAnomalyMonitor>> => {
  const foundAfter = await getOneCostAnomalyMonitor(
    { by: { unique: { name: input.name } } },
    input.context,
  );
  if (!foundAfter)
    UnexpectedCodePathError.throw('monitor not found after set', {
      name: input.name,
    });
  return foundAfter;
};

/**
 * .what = syncs tags via remove-old-then-add-new
 * .why = AWS has no single "set tags" call; drift reconciles by untag-then-tag
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
