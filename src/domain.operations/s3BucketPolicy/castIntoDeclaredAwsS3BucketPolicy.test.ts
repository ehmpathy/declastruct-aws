import { castIntoDeclaredAwsS3BucketPolicy } from './castIntoDeclaredAwsS3BucketPolicy';

/**
 * .what = unit coverage for the raw s3 bucket-policy json → domain cast
 * .why = pure boundary transform; the policy json is parsed + cast into the shared iam document
 *   dobjs so a re-plan compares domain objects, not two json strings. pins the bucket ref +
 *   the PascalCase→camelCase statement fields for the SES-put policy shape resources.mail.ts uses
 */
describe('castIntoDeclaredAwsS3BucketPolicy', () => {
  test('parses the AllowSesPut policy into the bucket ref + domain document', () => {
    const policyJson = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowSesPut',
          Effect: 'Allow',
          Principal: { Service: 'ses.amazonaws.com' },
          Action: 's3:PutObject',
          Resource: 'arn:aws:s3:::ehmpathy-mail-inbound-demo/inbound/*',
          Condition: {
            StringEquals: { 'aws:SourceAccount': '111122223333' },
          },
        },
      ],
    });

    const policy = castIntoDeclaredAwsS3BucketPolicy({
      bucketName: 'ehmpathy-mail-inbound-demo',
      policyJson,
    });

    expect(policy.bucket.name).toEqual('ehmpathy-mail-inbound-demo');
    expect(policy.document.statements).toHaveLength(1);

    const [statement] = policy.document.statements;
    expect(statement!.sid).toEqual('AllowSesPut');
    expect(statement!.effect).toEqual('Allow');
    expect(statement!.action).toEqual('s3:PutObject');
    expect(statement!.resource).toEqual(
      'arn:aws:s3:::ehmpathy-mail-inbound-demo/inbound/*',
    );
    expect(statement!.condition).toEqual({
      StringEquals: { 'aws:SourceAccount': '111122223333' },
    });
  });
});
