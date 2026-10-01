import { HelpfulError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import { delBucketLifecycle } from '@src/access/sdks/sdkS3/delBucketLifecycle';
import { getBucketLifecycle } from '@src/access/sdks/sdkS3/getBucketLifecycle';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

import { awaitStableReads } from './awaitStableReads';

/**
 * .what = deletes a bucket's lifecycle rule and polls until it reads ABSENT on several consecutive
 *   reads
 * .why = `setS3Bucket` reaches this from TWO distinct desired states, and both owe the same
 *   delete-then-converge (F6):
 *     - `lifecycle: null` — the full retract; no rule, no version state
 *     - a lifecycle whose only action is the version state — the rule is dropped, the version-state
 *       put still runs afterward
 *   the two are semantically different DECLARATIONS with one identical remote effect, so the shared
 *   procedure is keyed on the effect. a second copy of the poll could drift from the first on a
 *   single edit, and a drifted stability predicate is the exact defect F6 exists to close
 *
 * .note = DeleteBucketLifecycle is authorized by `s3:PutLifecycleConfiguration`, not by a distinct
 *   delete action — so a caller that can write a rule can always retract one
 */
export const retractS3BucketLifecycle = async (
  input: { name: string; stableReadsRequired: number; deadlineMs: number },
  context: ContextAwsApi & ContextLogTrail,
): Promise<void> => {
  await delBucketLifecycle({ name: input.name }, context);

  // DeleteBucketLifecycle is eventually consistent — poll until the read reports absent
  await awaitStableReads({
    read: () => getBucketLifecycle({ name: input.name }, context),
    isStable: (live) => live === null,
    stableReadsRequired: input.stableReadsRequired,
    deadlineMs: input.deadlineMs,
    onTimeout: (lastRead) =>
      new HelpfulError(
        's3 bucket lifecycle delete did not converge before the stability deadline',
        { name: input.name, lastRead },
      ),
  });
};
