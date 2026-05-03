import { given, then, when } from 'test-fns';

import { asAccountAliasFromListResponse } from './asAccountAliasFromListResponse';

describe('asAccountAliasFromListResponse', () => {
  given('undefined accountAliases', () => {
    when('transformed', () => {
      then('it returns null', () => {
        const result = asAccountAliasFromListResponse({
          accountAliases: undefined,
        });
        expect(result).toBeNull();
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('empty accountAliases array', () => {
    when('transformed', () => {
      then('it returns null', () => {
        const result = asAccountAliasFromListResponse({
          accountAliases: [],
        });
        expect(result).toBeNull();
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('accountAliases with one alias', () => {
    when('transformed', () => {
      then('it returns the alias', () => {
        const result = asAccountAliasFromListResponse({
          accountAliases: ['ehmpathy-demo'],
        });
        expect(result).toEqual('ehmpathy-demo');
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('accountAliases with multiple aliases', () => {
    // .note = AWS only allows one alias per account, but API returns array
    when('transformed', () => {
      then('it returns the first alias', () => {
        const result = asAccountAliasFromListResponse({
          accountAliases: ['first-alias', 'second-alias'],
        });
        expect(result).toEqual('first-alias');
        expect(result).toMatchSnapshot();
      });
    });
  });
});
