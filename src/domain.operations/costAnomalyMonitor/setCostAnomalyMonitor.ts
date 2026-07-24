import {
  type AnomalyMonitor,
  CreateAnomalyMonitorCommand,
  GetAnomalyMonitorsCommand,
  ListTagsForResourceCommand,
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
import { isDimensionalMonitorLimitError } from './isDimensionalMonitorLimitError';

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

    // create the monitor. a DIMENSIONAL (AWS-services) monitor is a per-account
    // singleton, so a create can hit the account limit when one already exists under
    // a different name (which getOneCostAnomalyMonitor, keyed by name, did not match).
    // in that case adopt the extant singleton (rename + retag) rather than a hard
    // failure — the singleton IS our monitor. never adopt a foreign-owned one.
    try {
      await client.send(
        new CreateAnomalyMonitorCommand({
          AnomalyMonitor: {
            MonitorName: desired.name,
            MonitorType: desired.kind,
            MonitorDimension: desired.dimension ?? undefined,
          },
          ResourceTags: desired.tags
            ? Object.entries(desired.tags).map(([Key, Value]) => ({
                Key,
                Value,
              }))
            : undefined,
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (!isDimensionalMonitorLimitError({ error })) throw error;

      // the per-account dimensional-monitor limit is reached: adopt the extant
      // singleton of the same dimension instead of a create
      await adoptDimensionalMonitorSingleton({ client, desired });
      return getOneAfter({ context, name: desired.name });
    }

    return getOneAfter({ context, name: desired.name });
  },
);

/**
 * .what = adopts the account's extant DIMENSIONAL monitor singleton to match desired
 * .why = AWS caps DIMENSIONAL (AWS-services) monitors at one per account, so a create
 *        that hits the limit means the singleton already exists (possibly under a
 *        stale name). the declarative reconcile is to rename + retag it to desired,
 *        not to fail — provided it is ours or unowned
 * .note = ownership guard: never rename a monitor that holds a DIFFERENT managedBy
 *         claim out from under its owner (rule.forbid.silent-resource-theft)
 */
const adoptDimensionalMonitorSingleton = async (input: {
  client: ReturnType<typeof getAwsCostExplorerClient>;
  desired: DeclaredAwsCostAnomalyMonitor;
}): Promise<void> => {
  const { client, desired } = input;

  // find the extant dimensional singleton of the same dimension
  const singleton = await getDimensionalMonitorSingleton({
    client,
    dimension: desired.dimension,
  });
  const arn =
    singleton?.MonitorArn ??
    UnexpectedCodePathError.throw(
      'dimensional-monitor limit reached but no extant singleton was found',
      { dimension: desired.dimension },
    );

  // read the extant tags to check ownership + reconcile
  const tagsResponse = await client.send(
    new ListTagsForResourceCommand({ ResourceArn: arn }),
  );
  const tagsExtant: Record<string, string> = {};
  for (const tag of tagsResponse.ResourceTags ?? [])
    if (tag.Key) tagsExtant[tag.Key] = tag.Value ?? '';

  // ownership guard: fail loud on a foreign claim rather than steal it
  const ownerDesired = desired.tags?.managedBy ?? null;
  const ownerExtant = tagsExtant.managedBy ?? null;
  if (ownerExtant && ownerDesired && ownerExtant !== ownerDesired)
    BadRequestError.throw(
      'a dimensional cost anomaly monitor already exists under a different owner (managedBy); cannot adopt it. delete it or reconcile the declaration',
      {
        extant: { arn, name: singleton?.MonitorName, managedBy: ownerExtant },
        desired: { name: desired.name, managedBy: ownerDesired },
      },
    );

  // adopt: rename the singleton to the desired name, then reconcile tags
  await client.send(
    new UpdateAnomalyMonitorCommand({
      MonitorArn: arn,
      MonitorName: desired.name,
    }),
  );
  await syncTags({
    client,
    arn,
    tagsBefore: Object.keys(tagsExtant).length > 0 ? tagsExtant : null,
    tagsDesired: desired.tags,
  });
};

/**
 * .what = pages GetAnomalyMonitors and returns the DIMENSIONAL monitor of a dimension
 * .why = AWS keeps at most one such singleton per account; adopt keys on it, not name
 */
const getDimensionalMonitorSingleton = async (input: {
  client: ReturnType<typeof getAwsCostExplorerClient>;
  dimension: 'SERVICE' | null;
}): Promise<AnomalyMonitor | undefined> => {
  const { client, dimension } = input;
  let nextPageToken: string | undefined;
  do {
    const response = await client.send(
      new GetAnomalyMonitorsCommand({ NextPageToken: nextPageToken }),
    );
    const found = (response.AnomalyMonitors ?? []).find(
      (monitor) =>
        monitor.MonitorType === 'DIMENSIONAL' &&
        monitor.MonitorDimension === dimension,
    );
    if (found) return found;
    nextPageToken = response.NextPageToken;
  } while (nextPageToken);
  return undefined;
};

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
