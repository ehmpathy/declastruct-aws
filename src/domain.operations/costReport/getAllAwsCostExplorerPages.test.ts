import { given, then, when } from 'test-fns';

import { getAllAwsCostExplorerPages } from './getAllAwsCostExplorerPages';

// a minimal fake of an aws cost-explorer paged response
interface FakePage {
  items: number[];
  summary: string;
  NextPageToken: string | undefined;
}

/**
 * .what = a true fake (not a mock) of the injected loadPage dependency: it serves
 *         canned pages keyed by the token it is called with, and records each call's
 *         token so the test can assert the cursor hand-off
 * .why = getAllAwsCostExplorerPages takes loadPage as a dependency-injected parameter,
 *        so a plain fake function IS dependency injection — no jest.mock, no remote
 *        boundary, per rule.forbid.unit.remote-boundaries
 */
const genLoadPageFake = (input: {
  pagesByToken: Record<string, FakePage>;
  firstToken: string;
}) => {
  const calls: (string | undefined)[] = [];
  const loadPage = async (token: string | undefined): Promise<FakePage> => {
    calls.push(token);
    return input.pagesByToken[token ?? input.firstToken]!;
  };
  return { loadPage, calls };
};

describe('getAllAwsCostExplorerPages', () => {
  given('[case1] a single page with no next token', () => {
    when('drained', () => {
      then('it yields that page items + firstResponse is page 1', async () => {
        const page1: FakePage = {
          items: [1, 2],
          summary: 'page-1',
          NextPageToken: undefined,
        };
        const fake = genLoadPageFake({
          pagesByToken: { start: page1 },
          firstToken: 'start',
        });

        const result = await getAllAwsCostExplorerPages<FakePage, number>({
          loadPage: fake.loadPage,
          getItems: (r) => r.items,
          getNextToken: (r) => r.NextPageToken,
        });

        expect(fake.calls).toEqual([undefined]);
        expect(result.items).toEqual([1, 2]);
        expect(result.firstResponse?.summary).toEqual('page-1');
      });
    });
  });

  given('[case2] two pages via a next-page token', () => {
    when('drained', () => {
      then(
        'it accumulates both pages items + firstResponse stays page 1',
        async () => {
          const fake = genLoadPageFake({
            pagesByToken: {
              start: {
                items: [1, 2],
                summary: 'page-1',
                NextPageToken: 'tok-2',
              },
              'tok-2': {
                items: [3],
                summary: 'page-2',
                NextPageToken: undefined,
              },
            },
            firstToken: 'start',
          });

          const result = await getAllAwsCostExplorerPages<FakePage, number>({
            loadPage: fake.loadPage,
            getItems: (r) => r.items,
            getNextToken: (r) => r.NextPageToken,
          });

          // it fed the token from page 1 into the page-2 load
          expect(fake.calls).toEqual([undefined, 'tok-2']);
          // it accumulated across pages
          expect(result.items).toEqual([1, 2, 3]);
          // firstResponse retains page-1-only fields (Summary/Metadata analog)
          expect(result.firstResponse?.summary).toEqual('page-1');
        },
      );
    });
  });

  given('[case3] a single page with zero items', () => {
    when('drained', () => {
      then('it yields an empty items array, not a throw', async () => {
        const page1: FakePage = {
          items: [],
          summary: 'empty',
          NextPageToken: undefined,
        };
        const fake = genLoadPageFake({
          pagesByToken: { start: page1 },
          firstToken: 'start',
        });

        const result = await getAllAwsCostExplorerPages<FakePage, number>({
          loadPage: fake.loadPage,
          getItems: (r) => r.items,
          getNextToken: (r) => r.NextPageToken,
        });

        expect(fake.calls).toEqual([undefined]);
        expect(result.items).toEqual([]);
        expect(result.firstResponse?.summary).toEqual('empty');
      });
    });
  });
});
