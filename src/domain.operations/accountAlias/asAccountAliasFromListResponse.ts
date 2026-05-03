/**
 * .what = extracts account alias from ListAccountAliases response
 * .why = AWS allows only one alias per account; encapsulates singleton selection
 * .note = returns null if no alias set
 */
export const asAccountAliasFromListResponse = (input: {
  accountAliases: string[] | undefined;
}): string | null => {
  // return null if no aliases present
  if (!input.accountAliases || input.accountAliases.length === 0) return null;

  // aws allows only one alias per account, take first
  return input.accountAliases[0]!;
};
