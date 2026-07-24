/**
 * .what = drains an aws cost-explorer token-cursor paginated api into all its items,
 *         plus the first page's response (which carries page-invariant fields like a
 *         Summary / Metadata that ride on every page)
 * .why = the `do { send } while (nextPageToken)` cursor loop was copy-pasted across the
 *        spend + recommendation reads. a missed `nextPageToken = response.NextPageToken`
 *        in a future composite would SILENTLY truncate results for a large account — this
 *        makes the cursor advance structural (it lives in ONE place) rather than a
 *        convention each caller must remember. the caller supplies only what varies: how
 *        to load a page, how to pull its items, and how to read its next-page token
 * .note = returns firstResponse so a caller that needs first-page-only fields (Summary,
 *         Metadata) keeps them without a second hold variable; it is undefined only if
 *         loadPage is never called, which cannot happen (the loop runs at least once)
 */
export const getAllAwsCostExplorerPages = async <TResponse, TItem>(input: {
  loadPage: (nextPageToken: string | undefined) => Promise<TResponse>;
  getItems: (response: TResponse) => TItem[];
  getNextToken: (response: TResponse) => string | undefined;
}): Promise<{ items: TItem[]; firstResponse: TResponse | undefined }> => {
  // .note = deliberate mutation: AWS pagination is a token-cursor loop — the cursor
  //         (nextPageToken), the first-page hold (firstResponse), and the accumulator
  //         (items) are mutated in-place across pages, the one shape the SDK's cursor
  //         demands. this is the single place that shape lives
  const items: TItem[] = [];
  let firstResponse: TResponse | undefined;
  let nextPageToken: string | undefined;
  do {
    const response = await input.loadPage(nextPageToken);
    firstResponse ??= response;
    items.push(...input.getItems(response));
    nextPageToken = input.getNextToken(response);
  } while (nextPageToken);
  return { items, firstResponse };
};
