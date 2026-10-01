import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { assertS3BucketVersionsNotRetracted } from './assertS3BucketVersionsNotRetracted';
import { getOneS3Bucket } from './getOneS3Bucket';
import { setS3BucketPropertiesReversible } from './setS3BucketPropertiesReversible';
import { setS3BucketVersionStateIrreversible } from './setS3BucketVersionStateIrreversible';

// stability-poll knobs — a matched read must repeat on this many CONSECUTIVE reads, within this
// window, before the write is trusted to have settled (rule.require.guaranteed-idempotency)
const STABLE_READS_NEEDED = 3;
const STABILITY_DEADLINE_MS = 60000;

/**
 * .what = creates or updates an S3 bucket (findsert | upsert)
 * .why = enables declarative management of a bucket's access, lifecycle, version-state, and tags
 *
 * .idempotency
 *   - findsert on the FULL unique key (name): look up by name, return the extant if present, else
 *     CreateBucket (a re-create of our own bucket is a no-op via BucketAlreadyOwnedByYou)
 *   - access + lifecycle + version-state + tags reconcile independently to desired on every upsert
 *
 * .note = the version-state put runs LAST (invariant I-1). it is the one IRREVERSIBLE write in
 *   this wish — a bucket that was Enabled cannot return to never-versioned. every other write is
 *   reversible on a retry, so the irreversible step must run only after every reversible step has
 *   succeeded; a partial apply that landed it first would leave a bucket versioned-by-accident with
 *   no noncurrent-expiry rule — the exact cost leak this wish exists to close (case=1 write-order).
 *
 *   ⇒ the constraint is carried by the SHAPE, not by this note alone: BOTH halves are named —
 *   `setS3BucketPropertiesReversible` then `setS3BucketVersionStateIrreversible` — so the whole of
 *   I-1 is the adjacency of two statements whose names state the invariant. a refactor that would
 *   break it must reorder two calls that say what they are, rather than drift a statement inside a
 *   long block.
 *
 *   ⚠️ the symmetry carries weight rather than polish: while the irreversible half sat INLINE, its
 *   position read as incidental beside a named peer, so a hoist for readability would have looked
 *   like a tidy-up rather than the permadrift it is
 */
export const setS3Bucket = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsS3Bucket;
      upsert: DeclaredAwsS3Bucket;
    }>,
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsS3Bucket>> => {
    const desired = input.findsert ?? input.upsert;

    // find the extant bucket by unique name
    const foundBefore = await getOneS3Bucket(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // findsert: return the extant unchanged
    if (foundBefore && input.findsert) return foundBefore;

    // I-1: reject an irreversible un-version retract BEFORE any write (case=3). aws cannot return a
    // versioned bucket to never-versioned, so a desired `versions: false` against a live versioned
    // bucket would silently no-op into a permadrift — fail loud and name `status: 'suspended'`
    assertS3BucketVersionsNotRetracted({ desired, found: foundBefore });

    // every REVERSIBLE write, in one named step: create-or-adopt, lifecycle, public-access block,
    // tags. it is a separate operation so the I-1 order below is ONE adjacency to respect rather
    // than a long block whose sequence reads arbitrary
    await setS3BucketPropertiesReversible(
      {
        desired,
        stableReadsRequired: STABLE_READS_NEEDED,
        deadlineMs: STABILITY_DEADLINE_MS,
      },
      context,
    );

    // the version-state put runs LAST — the one IRREVERSIBLE write (I-1)
    await setS3BucketVersionStateIrreversible(
      {
        desired,
        stableReadsRequired: STABLE_READS_NEEDED,
        deadlineMs: STABILITY_DEADLINE_MS,
      },
      context,
    );

    // read back the written bucket
    const foundAfter = await getOneS3Bucket(
      { by: { unique: { name: desired.name } } },
      context,
    );

    // failfast if absent after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('s3 bucket not found after set', {
        desired,
      });

    return foundAfter;
  },
);
