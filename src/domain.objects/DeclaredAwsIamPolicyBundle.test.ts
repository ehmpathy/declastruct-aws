import { given, then, when } from 'test-fns';

import { DeclaredAwsIamPolicyBundle } from './DeclaredAwsIamPolicyBundle';
import { DeclaredAwsIamPolicyDocument } from './DeclaredAwsIamPolicyDocument';
import { DeclaredAwsIamPolicyStatement } from './DeclaredAwsIamPolicyStatement';

describe('DeclaredAwsIamPolicyBundle', () => {
  given('managed policies only', () => {
    when('instantiated with managed arns and empty inline', () => {
      let bundle: DeclaredAwsIamPolicyBundle;

      then('it should instantiate', () => {
        bundle = new DeclaredAwsIamPolicyBundle({
          managed: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
          inline: new DeclaredAwsIamPolicyDocument({ statements: [] }),
        });
      });

      then('it should have managed policies', () => {
        expect(bundle.managed).toEqual([
          'arn:aws:iam::aws:policy/ReadOnlyAccess',
        ]);
      });

      then('it should have empty inline statements', () => {
        expect(bundle.inline.statements).toEqual([]);
      });
    });
  });

  given('inline policies only', () => {
    when('instantiated with empty managed and inline statements', () => {
      let bundle: DeclaredAwsIamPolicyBundle;

      then('it should instantiate', () => {
        bundle = new DeclaredAwsIamPolicyBundle({
          managed: [],
          inline: new DeclaredAwsIamPolicyDocument({
            statements: [
              new DeclaredAwsIamPolicyStatement({
                effect: 'Allow',
                action: 's3:GetObject',
                resource: 'arn:aws:s3:::my-bucket/*',
              }),
            ],
          }),
        });
      });

      then('it should have empty managed policies', () => {
        expect(bundle.managed).toEqual([]);
      });

      then('it should have inline statements', () => {
        expect(bundle.inline.statements).toHaveLength(1);
        expect(bundle.inline.statements[0]).toMatchObject({
          effect: 'Allow',
          action: 's3:GetObject',
        });
      });
    });
  });

  given('both managed and inline policies', () => {
    when('instantiated with both', () => {
      let bundle: DeclaredAwsIamPolicyBundle;

      then('it should instantiate', () => {
        bundle = new DeclaredAwsIamPolicyBundle({
          managed: [
            'arn:aws:iam::aws:policy/ReadOnlyAccess',
            'arn:aws:iam::aws:policy/CloudWatchLogsReadOnlyAccess',
          ],
          inline: new DeclaredAwsIamPolicyDocument({
            statements: [
              new DeclaredAwsIamPolicyStatement({
                effect: 'Allow',
                action: ['s3:PutObject', 's3:DeleteObject'],
                resource: 'arn:aws:s3:::my-bucket/*',
              }),
            ],
          }),
        });
      });

      then('it should have managed policies', () => {
        expect(bundle.managed).toHaveLength(2);
      });

      then('it should have inline statements', () => {
        expect(bundle.inline.statements).toHaveLength(1);
      });
    });
  });

  given('the static nested', () => {
    then('inline is nested as DeclaredAwsIamPolicyDocument', () => {
      expect(DeclaredAwsIamPolicyBundle.nested).toHaveProperty('inline');
    });
  });
});
