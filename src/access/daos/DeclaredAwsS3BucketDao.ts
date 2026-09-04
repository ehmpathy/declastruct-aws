import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import { delS3Bucket } from '@src/domain.operations/s3Bucket/delS3Bucket';
import { getOneS3Bucket } from '@src/domain.operations/s3Bucket/getOneS3Bucket';
import { setS3Bucket } from '@src/domain.operations/s3Bucket/setS3Bucket';

/**
 * .what = declastruct DAO for AWS S3 Bucket resources
 * .why = wraps the bucket operations to conform to the declastruct interface, so a bucket is
 *   drivable through plan/apply like its peers
 */
export const DeclaredAwsS3BucketDao = genDeclastructDao<
  typeof DeclaredAwsS3Bucket,
  ContextAwsApi & ContextLogTrail
>({
  dobj: DeclaredAwsS3Bucket,
  get: {
    one: {
      byPrimary: async (input, context) => {
        return getOneS3Bucket({ by: { primary: input } }, context);
      },
      byUnique: async (input, context) => {
        return getOneS3Bucket({ by: { unique: input } }, context);
      },
    },
  },
  set: {
    findsert: async (input, context) => {
      return setS3Bucket({ findsert: input }, context);
    },
    upsert: async (input, context) => {
      return setS3Bucket({ upsert: input }, context);
    },
    delete: async (input, context) => {
      await delS3Bucket({ by: { ref: input } }, context);
    },
  },
});
