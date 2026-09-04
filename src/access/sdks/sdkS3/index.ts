import { createBucket } from './createBucket';
import { delBucket } from './delBucket';
import { delBucketLifecycle } from './delBucketLifecycle';
import { delBucketPolicy } from './delBucketPolicy';
import { delBucketTags } from './delBucketTags';
import { getBucketLifecycle } from './getBucketLifecycle';
import { getBucketPolicy } from './getBucketPolicy';
import { getBucketTags } from './getBucketTags';
import { headBucket } from './headBucket';
import { putBucketLifecycle } from './putBucketLifecycle';
import { putBucketPolicy } from './putBucketPolicy';
import { putBucketTags } from './putBucketTags';

/**
 * .what = dao-style SDK wrapper for AWS S3
 * .why = provides raw i/o communicator operations for S3 buckets
 */
export const sdkS3 = {
  headBucket,
  createBucket,
  delBucket,
  getBucketLifecycle,
  putBucketLifecycle,
  delBucketLifecycle,
  getBucketTags,
  putBucketTags,
  delBucketTags,
  getBucketPolicy,
  putBucketPolicy,
  delBucketPolicy,
};
