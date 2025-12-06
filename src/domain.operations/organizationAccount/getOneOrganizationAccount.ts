import {
  DescribeAccountCommand,
  ListAccountsCommand,
  type OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import {
  BadRequestError,
  HelpfulError,
  UnexpectedCodePathError,
} from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsOrganizationsClient } from '../../access/sdks/getAwsOrganizationsClient';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import { castIntoDeclaredAwsOrganizationAccount } from './castIntoDeclaredAwsOrganizationAccount';
import { getOneOrganizationAccountTags } from './getOneOrganizationAccountTags';

/**
 * .what = retrieves a single organization account
 * .why = enables lookup by primary (id), unique (email), or auth
 * .note
 *   - returns null if not found (idempotent)
 *   - fails fast if not authed as org manager (required for account attributes)
 */
export const getOneOrganizationAccount = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;
        unique: RefByUnique<typeof DeclaredAwsOrganizationAccount>;
        ref: Ref<typeof DeclaredAwsOrganizationAccount>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsOrganizationAccount> | null> => {
    // route by.ref to appropriate handler
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsOrganizationAccount })(input.by.ref))
        return getOneOrganizationAccount(
          { by: { unique: input.by.ref } },
          context,
        );
      if (isRefByPrimary({ of: DeclaredAwsOrganizationAccount })(input.by.ref))
        return getOneOrganizationAccount(
          { by: { primary: input.by.ref } },
          context,
        );
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // get org client (fail-fast on non-org-manager auth)
    const { client, organization } = await getAwsOrganizationsClient(context);

    // by.unique requires search
    if (input.by.unique)
      return findAccountByEmail(input.by.unique.email, organization, client);

    // by.primary - lookup by id
    const accountId = input.by.primary?.id;
    if (!accountId)
      BadRequestError.throw('accountId required for by.primary lookup', {
        input,
      });

    // get account by id
    return getAccountById(accountId, organization, client);
  },
);

/**
 * .what = gets account by id from organization
 * .why = hydrates full account details including tags
 */
const getAccountById = async (
  accountId: string,
  organization: { id: string },
  client: OrganizationsClient,
): Promise<HasReadonly<typeof DeclaredAwsOrganizationAccount> | null> => {
  try {
    const response = await client.send(
      new DescribeAccountCommand({ AccountId: accountId }),
    );
    if (!response.Account) return null;

    // get tags
    const tags = await getOneOrganizationAccountTags(
      { by: { primary: { id: accountId } } },
      { client },
    );

    return castIntoDeclaredAwsOrganizationAccount({
      account: response.Account,
      organization: { id: organization.id },
      tags,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // account not found
    if (error.name === 'AccountNotFoundException') return null;

    throw new HelpfulError('getAccountById error', { cause: error });
  }
};

/**
 * .what = searches for account by email in organization
 * .why = unique key lookup requires iterating org accounts
 */
const findAccountByEmail = async (
  email: string,
  organization: { id: string },
  client: OrganizationsClient,
): Promise<HasReadonly<typeof DeclaredAwsOrganizationAccount> | null> => {
  let nextToken: string | undefined;
  do {
    const response = await client.send(
      new ListAccountsCommand({ NextToken: nextToken }),
    );

    // find the account by email
    const found = response.Accounts?.find((acc) => acc.Email === email);
    if (found) {
      // get full details via getAccountById
      return found.Id ? getAccountById(found.Id, organization, client) : null;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  // not found after iterating all accounts
  return null;
};
