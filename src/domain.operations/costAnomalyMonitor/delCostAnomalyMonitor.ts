import { DeleteAnomalyMonitorCommand } from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostAnomalyMonitor } from '@src/domain.objects/DeclaredAwsCostAnomalyMonitor';

import { getOneCostAnomalyMonitor } from './getOneCostAnomalyMonitor';

/**
 * .what = deletes a cost anomaly monitor by unique (name) or ref
 * .why = enables declarative teardown; idempotent — a no-op when already absent
 * .note
 *   - DeleteAnomalyMonitor is keyed by MonitorArn, so we getOne first to obtain the
 *     arn (there is no delete-by-name api)
 *   - a monitor delete also removes any alert subscription that references it, so
 *     those must be torn down first (declared-array order)
 */
export const delCostAnomalyMonitor = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCostAnomalyMonitor>;
        ref: Ref<typeof DeclaredAwsCostAnomalyMonitor>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsCostAnomalyMonitor })(input.by.ref))
        return delCostAnomalyMonitor({ by: { unique: input.by.ref } }, context);
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

    // getOne first to obtain the arn (delete is keyed by arn)
    const foundBefore = await getOneCostAnomalyMonitor(
      { by: { unique: { name: monitorName } } },
      context,
    );

    // idempotent: already absent
    if (!foundBefore) return;

    const arn =
      foundBefore.arn ??
      UnexpectedCodePathError.throw('extant monitor lacks an arn', {
        foundBefore,
      });

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      await client.send(new DeleteAnomalyMonitorCommand({ MonitorArn: arn }));
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'UnknownMonitorException') return;

      throw new HelpfulError('aws.delCostAnomalyMonitor error', {
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
