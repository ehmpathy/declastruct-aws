import { asProcedure } from 'as-procedure';
import type {
  HasReadonly,
  Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { getBucketLifecycle } from '@src/access/sdks/sdkS3/getBucketLifecycle';
import { getBucketTags } from '@src/access/sdks/sdkS3/getBucketTags';
import { headBucket } from '@src/access/sdks/sdkS3/headBucket';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

import { castIntoDeclaredAwsS3Bucket } from './castIntoDeclaredAwsS3Bucket';

/**
 * .what = gets a single S3 bucket from aws by primary (name), unique (name), or ref
 * .why = enables declarative drift detection; returns null when absent so the plan reads
 *   CREATE rather than throw (rule.forbid.plan-fail-on-apply-guided-prereq)
 */
export const getOneS3Bucket = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsS3Bucket>;
        unique: RefByUnique<typeof DeclaredAwsS3Bucket>;
        ref: Ref<typeof DeclaredAwsS3Bucket>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<HasReadonly<typeof DeclaredAwsS3Bucket> | null> => {
    // name is the whole identity across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw('getOneS3Bucket got a ref with no name', {
        input,
      });

    // head the bucket (false if absent or not ours)
    const found = await headBucket({ name }, context);
    if (!found) return null;

    // read the lifecycle config (null = persist)
    const lifecycle = await getBucketLifecycle({ name }, context);

    // read the tags (null = no tags)
    const tags = await getBucketTags({ name }, context);

    // cast to domain format
    return castIntoDeclaredAwsS3Bucket({ name, lifecycle, tags });
  },
);
