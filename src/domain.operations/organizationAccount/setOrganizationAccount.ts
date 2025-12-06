import {
  CreateAccountCommand,
  DescribeCreateAccountStatusCommand,
} from '@aws-sdk/client-organizations';
import { sleep } from '@ehmpathy/uni-time';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsOrganizationsClient } from '../../access/sdks/getAwsOrganizationsClient';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import { getOneOrganizationAccount } from './getOneOrganizationAccount';

/**
 * .what = creates an organization account (finsert only)
 * .why = accounts cannot be updated after creation, only created
 * .note
 *   - CreateAccount is async; this polls until completion
 *   - finsert returns foundBefore if email already exists (idempotent)
 *   - fails fast if not authed as org manager (required for account creation)
 */
export const setOrganizationAccount = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsOrganizationAccount;
      // Note: upsert not supported — accounts cannot be updated
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsOrganizationAccount>> => {
    const desired = input.finsert;

    // failfast if finsert not provided
    if (!desired)
      BadRequestError.throw(
        'finsert is required (accounts cannot be updated)',
        { input },
      );

    // get org client (fail-fast on non-org-manager auth)
    const { client, organization } = await getAwsOrganizationsClient(context);

    // validate that the desired org (if provided) matches the authed account's org
    if (desired.organization && organization.id !== desired.organization.id)
      BadRequestError.throw(
        'organization mismatch: authed account org does not match desired organization',
        {
          desired: desired.organization.id,
          actual: organization.id,
        },
      );

    // check if already exists (idempotent finsert)
    const foundBefore = await getOneOrganizationAccount(
      { by: { unique: { email: desired.email } } },
      context,
    );
    if (foundBefore) return foundBefore;

    // create account (async operation)
    const createResponse = await client.send(
      new CreateAccountCommand({
        AccountName: desired.name,
        Email: desired.email,
        IamUserAccessToBilling: desired.iamUserAccessToBilling ?? 'ALLOW',
        RoleName: desired.roleName ?? 'OrganizationAccountAccessRole',
        Tags: desired.tags
          ? Object.entries(desired.tags).map(([Key, Value]) => ({
              Key,
              Value,
            }))
          : undefined,
      }),
    );

    // extract request ID
    const requestId = createResponse.CreateAccountStatus?.Id;
    if (!requestId)
      HelpfulError.throw('CreateAccount did not return a request ID', {
        createResponse,
      });

    // poll until completion
    let status = createResponse.CreateAccountStatus;
    while (status?.State === 'IN_PROGRESS') {
      await sleep(2000); // wait 2 seconds between polls
      const statusResponse = await client.send(
        new DescribeCreateAccountStatusCommand({
          CreateAccountRequestId: requestId,
        }),
      );
      status = statusResponse.CreateAccountStatus;
    }

    // handle failure
    if (status?.State === 'FAILED')
      HelpfulError.throw('Account creation failed', {
        failureReason: status.FailureReason,
        accountName: desired.name,
        email: desired.email,
      });

    // failfast if no account ID returned
    if (!status?.AccountId)
      HelpfulError.throw(
        'Account creation succeeded but no AccountId returned',
        { status },
      );

    // fetch the created account
    const foundAfter = await getOneOrganizationAccount(
      { by: { primary: { id: status.AccountId } } },
      context,
    );

    // failfast if account not found
    if (!foundAfter)
      HelpfulError.throw('Account creation succeeded but account not found', {
        accountId: status.AccountId,
      });

    return foundAfter;
  },
);
