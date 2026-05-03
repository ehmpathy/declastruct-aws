import { serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { DeclaredAwsAccountAlias } from './DeclaredAwsAccountAlias';

describe('DeclaredAwsAccountAlias', () => {
  given('a valid alias', () => {
    when('instantiated', () => {
      then('it should instantiate with correct alias', () => {
        const alias = new DeclaredAwsAccountAlias({
          alias: 'ehmpathy-demo',
        });
        expect(alias).toMatchObject({
          alias: 'ehmpathy-demo',
        });
      });
    });
  });

  given('an alias with numbers', () => {
    when('instantiated', () => {
      then('it should instantiate', () => {
        const alias = new DeclaredAwsAccountAlias({
          alias: 'abc123def',
        });
        expect(alias.alias).toEqual('abc123def');
      });
    });
  });

  given('the static keys', () => {
    then('primary is defined as alias', () => {
      expect(DeclaredAwsAccountAlias.primary).toEqual(['alias']);
    });
  });

  given('serialize and deserialize', () => {
    when('roundtrip', () => {
      then('it should preserve the alias', () => {
        const original = new DeclaredAwsAccountAlias({
          alias: 'ehmpathy-demo',
        });
        const serialized = serialize(original);
        const deserialized = new DeclaredAwsAccountAlias(
          JSON.parse(serialized),
        );
        expect(deserialized.alias).toEqual(original.alias);
      });
    });
  });
});
