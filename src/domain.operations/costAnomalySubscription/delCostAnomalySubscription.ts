import { DeleteAnomalySubscriptionCommand } from '@aws-sdk/client-cost-explorer';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsCostExplorerClient } from '@src/access/sdks/getAwsCostExplorerClient';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsCostAnomalySubscription } from '@src/domain.objects/DeclaredAwsCostAnomalySubscription';

import { getOneCostAnomalySubscription } from './getOneCostAnomalySubscription';

/**
 * .what = deletes a cost anomaly subscription by unique (name) or ref
 * .why = enables declarative teardown; idempotent — a no-op when already absent
 * .note
 *   - Cost Explorer addresses the delete by SubscriptionArn, so we getOne first
 *     to obtain the arn
 *   - a subscription references its monitor, so tear the subscription down before
 *     the monitor (declared-array order)
 */
export const delCostAnomalySubscription = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsCostAnomalySubscription>;
        ref: Ref<typeof DeclaredAwsCostAnomalySubscription>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // handle by ref via a type guard
    if (input.by.ref) {
      if (
        isRefByUnique({ of: DeclaredAwsCostAnomalySubscription })(input.by.ref)
      )
        return delCostAnomalySubscription(
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

    // getOne to obtain the arn; idempotent no-op when already absent
    const found = await getOneCostAnomalySubscription(
      { by: { unique: { name: subscriptionName } } },
      context,
    );
    if (!found) return;

    // declare the client (pinned to us-east-1)
    const client = getAwsCostExplorerClient();

    try {
      await client.send(
        new DeleteAnomalySubscriptionCommand({
          SubscriptionArn:
            found.arn ??
            UnexpectedCodePathError.throw('extant subscription lacks an arn', {
              found,
            }),
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already absent
      if (error.name === 'UnknownSubscriptionException') return;

      throw new HelpfulError('aws.delCostAnomalySubscription error', {
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
