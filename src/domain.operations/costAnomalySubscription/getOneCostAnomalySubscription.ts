import {
  type AnomalySubscription,
  GetAnomalyMonitorsCommand,
  type GetAnomalyMonitorsCommandOutput,
  GetAnomalySubscriptionsCommand,
  type GetAnomalySubscriptionsCommandOutput,
  ListTagsForResourceCommand,
} from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByUnique,
  type Ref,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';
import { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';

import { castIntoDeclaredAwsCostAnomalySubscription } from './castIntoDeclaredAwsCostAnomalySubscription';

/**
 * .what = retrieves a cost anomaly subscription by unique (name) or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - a subscription has no artificial primary key; it is addressed by
 *     AccountId (from context) + SubscriptionName
 *   - Cost Explorer has no get-by-name, so we page GetAnomalySubscriptions and
 *     match on SubscriptionName
 *   - to supply the monitor ref the cast needs, we page GetAnomalyMonitors and
 *     match the subscription's first MonitorArn back to a monitor name
 *   - returns null if the subscription is absent
 */
export const getOneCostAnomalySubscription = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCostAnomalySubscription>;
        ref: Ref<typeof DeclaredAwsCostAnomalySubscription>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostAnomalySubscription> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (
        isRefByUnique({ of: DeclaredAwsCostAnomalySubscription })(input.by.ref)
      )
        return getOneCostAnomalySubscription(
          { by: { unique: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('subscription ref is not a unique ref', {
        input,
      });
    }

    // determine the subscription name
    const subscriptionName = input.by.unique
      ? input.by.unique.name
      : UnexpectedCodePathError.throw('not referenced by unique. how not?', {
          input,
        });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      // page through subscriptions and match on name
      let nextPageToken: string | undefined;
      let found: AnomalySubscription | undefined;
      do {
        const response: GetAnomalySubscriptionsCommandOutput =
          await client.send(
            new GetAnomalySubscriptionsCommand({
              NextPageToken: nextPageToken,
            }),
          );
        found = (response.AnomalySubscriptions ?? []).find(
          (subscription) => subscription.SubscriptionName === subscriptionName,
        );
        nextPageToken = response.NextPageToken;
      } while (!found && nextPageToken);

      // handle subscription absent
      if (!found) return null;

      // derive the monitor name from the subscription's first MonitorArn. a
      // malformed orphan (MonitorArnList empty — its monitor was pruned out from
      // under it) yields monitorRef=null. do NOT throw: a plan reads EVERY declared
      // resource, so a throw here aborts the whole plan; instead pass the null
      // through so the plan sees drift (declared monitor vs null) and reconciles via
      // UPDATE, or a del can tear the orphan down. see
      // rule.forbid.plan-fail-on-apply-guided-prereq
      const monitorArn = found.MonitorArnList?.[0];
      const monitorRef = await (async () => {
        if (monitorArn) return deriveMonitorRef({ client, monitorArn });
        context.log.warn(
          'aws.getOneCostAnomalySubscription: subscription has no MonitorArn (malformed orphan); read as monitor=null for reconcile',
          { subscriptionName },
        );
        return null;
      })();

      // fetch tags via the subscription arn
      const tagsResponse = await client.send(
        new ListTagsForResourceCommand({
          ResourceArn:
            found.SubscriptionArn ??
            UnexpectedCodePathError.throw(
              'subscription lacks a SubscriptionArn',
              {
                found,
              },
            ),
        }),
      );

      return castIntoDeclaredAwsCostAnomalySubscription({
        subscription: found,
        monitorRef,
        tags: tagsResponse.ResourceTags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // sanitize the cause: a raw AWS SDK error carries a circular protocol/serdeContext
      // ref, so a straight `cause: error` makes HelpfulError throw a circular-structure
      // TypeError that MASKS the real error. wrap it in a plain Error that keeps the name +
      // message + aws metadata, so the true failure surfaces loud instead of the mask
      const awsMetadata = (
        error as { $metadata?: { httpStatusCode?: number; requestId?: string } }
      ).$metadata;
      const cause = new Error(`${error.name}: ${error.message}`);

      throw new HelpfulError('aws.getOneCostAnomalySubscription error', {
        cause,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          httpStatusCode: awsMetadata?.httpStatusCode ?? null,
          requestId: awsMetadata?.requestId ?? null,
          input,
        },
      });
    }
  },
);

/**
 * .what = pages GetAnomalyMonitors and matches a MonitorArn back to a monitor name
 * .why = the cast needs the monitor as a RefByUnique (name), but the subscription
 *        stores only the ARN
 */
const deriveMonitorRef = async (input: {
  client: ReturnType<typeof getAwsCostExplorerClient>;
  monitorArn: string | undefined;
}): Promise<RefByUnique<typeof DeclaredAwsCostAnomalyMonitor>> => {
  const { client, monitorArn } = input;
  // .note = metadata must be `{ monitorArn }`, NOT `{ input }`: input carries the AWS SDK
  //   client, which holds a circular protocol/serdeContext ref. serializing it into the
  //   error throws a circular-structure TypeError that MASKS this real message
  if (!monitorArn)
    UnexpectedCodePathError.throw('subscription lacks a MonitorArn', {
      monitorArn,
    });

  let nextPageToken: string | undefined;
  do {
    const response: GetAnomalyMonitorsCommandOutput = await client.send(
      new GetAnomalyMonitorsCommand({ NextPageToken: nextPageToken }),
    );
    const monitor = (response.AnomalyMonitors ?? []).find(
      (candidate) => candidate.MonitorArn === monitorArn,
    );
    if (monitor?.MonitorName) return { name: monitor.MonitorName };
    nextPageToken = response.NextPageToken;
  } while (nextPageToken);

  return UnexpectedCodePathError.throw(
    'no monitor matches the subscription MonitorArn',
    { monitorArn },
  );
};
