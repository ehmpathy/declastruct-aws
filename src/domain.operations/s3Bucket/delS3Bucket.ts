import { asProcedure } from 'as-procedure';
import type { Ref, RefByPrimary, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import { delBucket } from '@src/access/sdks/sdkS3/delBucket';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';

/**
 * .what = deletes an S3 bucket by primary (name), unique (name), or ref
 * .why = the idempotent destroy path the DAO's set.delete drives; an absent bucket is a
 *   no-op so a repeat delete converges
 * .note = aws requires the bucket be empty; a non-empty bucket fails loud (by design)
 */
export const delS3Bucket = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsS3Bucket>;
        unique: RefByUnique<typeof DeclaredAwsS3Bucket>;
        ref: Ref<typeof DeclaredAwsS3Bucket>;
      }>;
    },
    context: ContextAwsApi & ContextLogTrail,
  ): Promise<void> => {
    // name is the whole identity across primary, unique, and ref
    const name =
      input.by.primary?.name ?? input.by.unique?.name ?? input.by.ref?.name;
    if (!name)
      UnexpectedCodePathError.throw('delS3Bucket got a ref with no name', {
        input,
      });

    // delete the bucket (idempotent)
    await delBucket({ name }, context);
  },
);
