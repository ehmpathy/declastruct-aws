import { BadRequestError } from 'helpful-errors';

/**
 * .what = builds the actionable fail-loud error for a DeleteBucket that aws refused as BucketNotEmpty
 * .why = aws's own BucketNotEmpty is silent on the real cause: object VERSIONS and DELETE MARKERS
 *   count as contents, so an operator who has just run `aws s3 rm --recursive` on a versioned
 *   bucket reads a message that contradicts what they observed. this names versions + markers,
 *   the absent `s3:DeleteObjectVersion` grant, the admin path, and the global-name cost
 *   (vision case=7 rung 2, ruled in by F8). it teaches only — it never purges (rule.forbid.failhide)
 */
export const getBucketNotEmptyError = (input: {
  name: string;
  awsMessage: string;
}): BadRequestError =>
  new BadRequestError(
    `BucketNotEmpty: bucket "${input.name}" still holds contents. aws counts object VERSIONS and DELETE MARKERS as contents, so on a bucket whose versions are (or were) enabled, \`aws s3 rm --recursive\` does not empty it — each delete writes a marker, and each marker is itself a version. a versions status of 'suspended' does NOT undo this. fix: remove every version and marker, which needs \`s3:DeleteObjectVersion\` (use admin credentials): \`aws s3api list-object-versions --bucket ${input.name}\`, then \`aws s3api delete-object --bucket ${input.name} --key <key> --version-id <versionId>\` for each. note: a bucket name is GLOBAL — until this is cleared, the name is unusable everywhere`,
    { bucket: input.name, awsMessage: input.awsMessage },
  );
