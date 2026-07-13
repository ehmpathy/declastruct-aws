import {
  type AnomalyMonitor,
  GetAnomalyMonitorsCommand,
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
import { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';

import { castIntoDeclaredAwsCostAnomalyMonitor } from './castIntoDeclaredAwsCostAnomalyMonitor';

/**
 * .what = retrieves a cost anomaly monitor by unique (name) or ref
 * .why = enables lookup for idempotent findsert/upsert and drift detection
 * .note
 *   - a monitor has no get-by-name api, so we page through GetAnomalyMonitors and
 *     match on MonitorName
 *   - tags come from a separate ListTagsForResource call keyed by the monitor arn
 *   - returns null if the monitor is absent
 */
export const getOneCostAnomalyMonitor = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCostAnomalyMonitor>;
        ref: Ref<typeof DeclaredAwsCostAnomalyMonitor>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsCostAnomalyMonitor> | null> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsCostAnomalyMonitor })(input.by.ref))
        return getOneCostAnomalyMonitor(
          { by: { unique: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('monitor ref is not a unique ref', {
        input,
      });
    }

    // determine the monitor name
    const monitorName = input.by.unique
      ? input.by.unique.name
      : UnexpectedCodePathError.throw('not referenced by unique. how not?', {
          input,
        });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      // page through all monitors and match on name
      let found: AnomalyMonitor | undefined;
      let nextPageToken: string | undefined;
      do {
        const response = await client.send(
          new GetAnomalyMonitorsCommand({ NextPageToken: nextPageToken }),
        );
        found = (response.AnomalyMonitors ?? []).find(
          (monitor) => monitor.MonitorName === monitorName,
        );
        nextPageToken = response.NextPageToken;
      } while (!found && nextPageToken);

      // handle monitor absent
      if (!found) return null;

      // fetch tags via the monitor arn
      const tagsResponse = await client.send(
        new ListTagsForResourceCommand({
          ResourceArn:
            found.MonitorArn ??
            UnexpectedCodePathError.throw('monitor lacks a MonitorArn', {
              found,
            }),
        }),
      );

      return castIntoDeclaredAwsCostAnomalyMonitor({
        monitor: found,
        tags: tagsResponse.ResourceTags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError('aws.getOneCostAnomalyMonitor error', {
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
