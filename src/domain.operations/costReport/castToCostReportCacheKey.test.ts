import { given, then } from 'test-fns';

import { castToCostReportCacheKey } from './castToCostReportCacheKey';

describe('castToCostReportCacheKey', () => {
  const procedure = { name: 'getOneCostReportSpendObserved', version: 'v1' };
  const unique = { range: { since: 'a', until: 'b' }, granularity: 'MONTHLY' };
  const contextA = {
    aws: { credentials: { account: '111122223333', region: 'us-east-1' } },
  };

  given('[case1] the same procedure + unique + credentials', () => {
    then('the key is deterministic (identical inputs → identical key)', () => {
      expect(
        castToCostReportCacheKey({ procedure, unique, context: contextA }),
      ).toEqual(
        castToCostReportCacheKey({ procedure, unique, context: contextA }),
      );
    });
  });

  given('[case2] a different ACCOUNT, same query', () => {
    const contextB = {
      aws: { credentials: { account: '444455556666', region: 'us-east-1' } },
    };

    then('the key differs — no cross-tenant cache collision', () => {
      expect(
        castToCostReportCacheKey({ procedure, unique, context: contextA }),
      ).not.toEqual(
        castToCostReportCacheKey({ procedure, unique, context: contextB }),
      );
    });
  });

  given('[case3] a different REGION, same account + query', () => {
    const contextC = {
      aws: { credentials: { account: '111122223333', region: 'eu-west-1' } },
    };

    then('the key differs — region is part of the tenant scope', () => {
      expect(
        castToCostReportCacheKey({ procedure, unique, context: contextA }),
      ).not.toEqual(
        castToCostReportCacheKey({ procedure, unique, context: contextC }),
      );
    });
  });

  given('[case4] a different @unique query, same credentials', () => {
    const uniqueOther = { ...unique, granularity: 'DAILY' };

    then('the key differs — the query is part of the identity', () => {
      expect(
        castToCostReportCacheKey({ procedure, unique, context: contextA }),
      ).not.toEqual(
        castToCostReportCacheKey({
          procedure,
          unique: uniqueOther,
          context: contextA,
        }),
      );
    });
  });
});
