import { given, then, when } from 'test-fns';

import { DeclaredAwsIamOidcProvider } from './DeclaredAwsIamOidcProvider';

describe('DeclaredAwsIamOidcProvider', () => {
  given('a valid oidc provider url', () => {
    when('instantiated with minimal properties', () => {
      let provider: DeclaredAwsIamOidcProvider;

      then('it should instantiate', () => {
        provider = new DeclaredAwsIamOidcProvider({
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
          thumbprints: [],
        });
      });

      then('it should have the url', () => {
        expect(provider).toMatchObject({
          url: 'https://token.actions.githubusercontent.com',
        });
      });

      then('metadata is undefined by default', () => {
        expect(provider.arn).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and tags', () => {
      let provider: DeclaredAwsIamOidcProvider;

      then('it should instantiate', () => {
        provider = new DeclaredAwsIamOidcProvider({
          arn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
          thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
          tags: { purpose: 'github-actions' },
        });
      });

      then('it should have all properties', () => {
        expect(provider).toMatchObject({
          arn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
          thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
        });
        expect(provider.tags).toEqual({ purpose: 'github-actions' });
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as arn', () => {
      expect(DeclaredAwsIamOidcProvider.primary).toEqual(['arn']);
    });

    then('unique is defined as url', () => {
      expect(DeclaredAwsIamOidcProvider.unique).toEqual(['url']);
    });

    then('metadata is defined as arn', () => {
      expect(DeclaredAwsIamOidcProvider.metadata).toEqual(['arn']);
    });
  });
});
