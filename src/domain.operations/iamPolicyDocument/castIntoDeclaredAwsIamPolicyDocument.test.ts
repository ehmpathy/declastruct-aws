import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsIamPolicyDocument } from './castIntoDeclaredAwsIamPolicyDocument';

describe('castIntoDeclaredAwsIamPolicyDocument', () => {
  given('[case1] inline json with NotResource', () => {
    const json = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyNonPlanSsmParameters',
          Effect: 'Deny',
          Action: 'ssm:GetParameter*',
          NotResource: 'arn:aws:ssm:*:*:parameter/cicd/scope=plan/*',
        },
      ],
    });

    when('[t0] parsed into domain', () => {
      then('resource becomes the `{ exclude }` scope variant', () => {
        const doc = castIntoDeclaredAwsIamPolicyDocument(json);
        expect(doc.statements).toHaveLength(1);
        expect(doc.statements[0]!.resource).toEqual({
          exclude: 'arn:aws:ssm:*:*:parameter/cicd/scope=plan/*',
        });
        expect(doc.statements[0]!.action).toEqual('ssm:GetParameter*');
        expect(doc.statements).toMatchSnapshot();
      });
    });
  });

  given('[case2] inline json with NotAction and NotPrincipal', () => {
    const json = JSON.stringify({
      Statement: [
        {
          Effect: 'Deny',
          NotPrincipal: { AWS: 'arn:aws:iam::123456789012:root' },
          NotAction: ['s3:DeleteObject'],
          Resource: '*',
        },
      ],
    });

    when('[t0] parsed into domain', () => {
      then('action and principal become `{ exclude }` variants', () => {
        const doc = castIntoDeclaredAwsIamPolicyDocument(json);
        const stmt = doc.statements[0]!;
        expect(stmt.action).toEqual({ exclude: ['s3:DeleteObject'] });
        expect(stmt.principal).toEqual({
          exclude: { aws: 'arn:aws:iam::123456789012:root' },
        });
        expect(stmt.resource).toEqual('*');
        expect(stmt).toMatchSnapshot();
      });
    });
  });

  given('[case3] a positive-only statement', () => {
    const json = JSON.stringify({
      Statement: [
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:PutLogEvents'],
          Resource: '*',
        },
      ],
    });

    when('[t0] parsed into domain', () => {
      then('it stays positive (no exclusion wrappers)', () => {
        const stmt = castIntoDeclaredAwsIamPolicyDocument(json).statements[0]!;
        expect(stmt.action).toEqual([
          'logs:CreateLogGroup',
          'logs:PutLogEvents',
        ]);
        expect(stmt.resource).toEqual('*');
        expect(stmt).toMatchSnapshot();
      });
    });
  });

  given('[case4] an empty or absent policy', () => {
    when('[t0] undefined is parsed', () => {
      then('it returns an empty statement list', () => {
        const doc = castIntoDeclaredAwsIamPolicyDocument(undefined);
        expect(doc.statements).toEqual([]);
      });
    });
  });

  given('[case5] inline json with a nonsensical NotPrincipal of "*"', () => {
    const json = JSON.stringify({
      Statement: [
        {
          Effect: 'Deny',
          NotPrincipal: '*',
          Action: 's3:GetObject',
          Resource: '*',
        },
      ],
    });

    when('[t0] parsed into domain', () => {
      then(
        'it fails fast (a NotPrincipal must exclude a concrete principal)',
        async () => {
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyDocument(json),
          );
          expect(error.message).toContain(
            'NotPrincipal must exclude a concrete',
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });

  given(
    '[case6] a malformed statement with both a positive and its `Not`',
    () => {
      when('[t0] both Resource and NotResource are present', () => {
        then('it fails fast', async () => {
          const json = JSON.stringify({
            Statement: [
              {
                Effect: 'Deny',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::a/*',
                NotResource: 'arn:aws:s3:::b/*',
              },
            ],
          });
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyDocument(json),
          );
          expect(error.message).toContain('both "Resource" and its "Not"');
          expect(error.message).toMatchSnapshot();
        });
      });

      when('[t1] both Principal and NotPrincipal are present', () => {
        then('it fails fast', async () => {
          const json = JSON.stringify({
            Statement: [
              {
                Effect: 'Deny',
                Principal: { AWS: 'arn:aws:iam::123456789012:root' },
                NotPrincipal: { AWS: 'arn:aws:iam::999999999999:root' },
                Action: 's3:GetObject',
                Resource: '*',
              },
            ],
          });
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyDocument(json),
          );
          expect(error.message).toContain(
            'both "Principal" and "NotPrincipal"',
          );
          expect(error.message).toMatchSnapshot();
        });
      });

      when('[t2] both Action and NotAction are present', () => {
        then('it fails fast', async () => {
          const json = JSON.stringify({
            Statement: [
              {
                Effect: 'Deny',
                Action: 's3:GetObject',
                NotAction: 's3:DeleteObject',
                Resource: '*',
              },
            ],
          });
          const error = await getError(() =>
            castIntoDeclaredAwsIamPolicyDocument(json),
          );
          expect(error.message).toContain('both "Action" and its "Not"');
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );
});
