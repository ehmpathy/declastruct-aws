import { DeclaredAwsAccountAlias } from '@src/domain.objects/DeclaredAwsAccountAlias';

/**
 * .what = transforms alias string to DeclaredAwsAccountAlias
 * .why = ListAccountAliasesCommand returns string[], we need domain object
 */
export const castIntoDeclaredAwsAccountAlias = (input: {
  alias: string;
}): DeclaredAwsAccountAlias => {
  return new DeclaredAwsAccountAlias({
    alias: input.alias,
  });
};
