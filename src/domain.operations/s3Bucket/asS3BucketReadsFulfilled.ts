import { HelpfulError } from 'helpful-errors';

import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';
import type { S3BucketPublicAccessBlockParams } from '@src/domain.objects/S3BucketPublicAccessBlockParams';

/**
 * .what = unwraps the four settled bucket-level reads, or throws loud and names EVERY one that failed
 * .why = `getOneS3Bucket` fires its four reads in parallel for latency (A-8: they run on every
 *   bucket on every plan). `Promise.all` would have surfaced only the FIRST settled rejection and
 *   discarded its peers — so under a genuine multi-cause failure (one read hits a real defect
 *   while another hits `AccessDenied`) which error an operator saw would depend on which read
 *   settled first, and the other cause would vanish with no trace.
 *
 *   ⚠️ the SEQUENTIAL form this replaced had no such hazard: the failed read was always the first
 *   attempted, in a fixed order, so the error was reproducible. this transformer is what buys the
 *   latency win back WITHOUT that trade (rule.require.failloud — an error carries rich context).
 *
 * .note = a SINGLE rejection is rethrown UNCHANGED, deliberately. the error's class, message, and
 *   `.name` must stay byte-identical to the sequential form, because callers and tests key on
 *   them — `AccessDenied` above all, whose loud propagation is what keeps an absent iam READ
 *   grant from a read as a phantom CREATE (case=6 [t2]). only the two-or-more case aggregates,
 *   and that case had no faithful representation at all before.
 */
export const asS3BucketReadsFulfilled = (input: {
  name: string;
  settled: [
    PromiseSettledResult<S3BucketPublicAccessBlockParams | null>,
    // ⚠️ the RAW string aws returned, deliberately un-narrowed. `getBucketVersioning` reads the
    //   wire value and `castIntoDeclaredAwsS3Bucket` is what asserts it against the closed set —
    //   so a narrow here would move that boundary, and case=4's loud throw with it
    PromiseSettledResult<string | null>,
    PromiseSettledResult<S3BucketLifecycleParams | null>,
    PromiseSettledResult<Record<string, string> | null>,
  ];
}): [
  S3BucketPublicAccessBlockParams | null,
  string | null,
  S3BucketLifecycleParams | null,
  Record<string, string> | null,
] => {
  const { name, settled } = input;

  // the read each slot holds, so a rejection can say WHICH read failed rather than an index
  const labels = [
    'publicAccessBlock',
    'versionStatus',
    'lifecycle',
    'tags',
  ] as const;

  // collect every rejection, never merely the first
  const rejections = settled.flatMap((outcome, index) =>
    outcome.status === 'rejected'
      ? [{ read: labels[index]!, error: outcome.reason as unknown }]
      : [],
  );

  // exactly one failed: rethrow it verbatim, so no caller sees a changed error class
  if (rejections.length === 1) throw rejections[0]!.error;

  // two or more failed: aggregate, so no cause is discarded
  if (rejections.length)
    throw new HelpfulError(
      `getOneS3Bucket: ${rejections.length} of 4 bucket-level reads failed for "${name}"`,
      {
        name,
        rejections: rejections.map((rejection) => ({
          read: rejection.read,
          error:
            rejection.error instanceof Error
              ? { name: rejection.error.name, message: rejection.error.message }
              : rejection.error,
        })),
      },
    );

  // every read fulfilled — unwrap in slot order
  const [publicAccessBlock, versionStatus, lifecycle, tags] = settled;
  return [
    publicAccessBlock.status === 'fulfilled' ? publicAccessBlock.value : null,
    versionStatus.status === 'fulfilled' ? versionStatus.value : null,
    lifecycle.status === 'fulfilled' ? lifecycle.value : null,
    tags.status === 'fulfilled' ? tags.value : null,
  ];
};
