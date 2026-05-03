import { given, then, when } from 'test-fns';

import { DeclaredAwsAccountAlias } from '@src/domain.objects/DeclaredAwsAccountAlias';

import { castIntoDeclaredAwsAccountAlias } from './castIntoDeclaredAwsAccountAlias';

describe('castIntoDeclaredAwsAccountAlias', () => {
  given('a valid alias string', () => {
    when('cast to domain object', () => {
      then('it should return DeclaredAwsAccountAlias', () => {
        const result = castIntoDeclaredAwsAccountAlias({
          alias: 'ehmpathy-demo',
        });
        expect(result).toBeInstanceOf(DeclaredAwsAccountAlias);
        expect(result.alias).toEqual('ehmpathy-demo');
      });
    });
  });

  given('an alias with numbers', () => {
    when('cast to domain object', () => {
      then('it should preserve the alias', () => {
        const result = castIntoDeclaredAwsAccountAlias({
          alias: 'abc123def',
        });
        expect(result.alias).toEqual('abc123def');
      });
    });
  });
});
