import { RefByUnique } from 'domain-objects';

import type { DeclaredAwsS3Bucket } from '@src/domain.objects/DeclaredAwsS3Bucket';
import { DeclaredAwsS3BucketPolicy } from '@src/domain.objects/DeclaredAwsS3BucketPolicy';
import {
  castIntoDeclaredAwsIamPolicyDocument,
  type SdkAwsPolicyDocumentRaw,
} from '@src/domain.operations/iamRole/castIntoDeclaredAwsIamPolicyDocument';

/**
 * .what = transforms a raw S3 bucket-policy json string into DeclaredAwsS3BucketPolicy
 * .why = the policy document reuses the shared iam policy dobjs; the raw aws json is parsed
 *   + cast so a re-plan compares the domain document, not two different json strings
 */
export const castIntoDeclaredAwsS3BucketPolicy = (input: {
  bucketName: string;
  policyJson: string;
}): DeclaredAwsS3BucketPolicy => {
  // parse the raw aws policy json into the shared document shape
  // boundary cast: JSON.parse returns `any`, so the parsed value is asserted to the raw
  // aws policy-document shape at this decode boundary (rule.forbid.as-cast — parse boundary)
  const raw = JSON.parse(input.policyJson) as SdkAwsPolicyDocumentRaw;

  return DeclaredAwsS3BucketPolicy.as({
    bucket: RefByUnique.as<typeof DeclaredAwsS3Bucket>({
      name: input.bucketName,
    }),
    document: castIntoDeclaredAwsIamPolicyDocument(raw),
  });
};
