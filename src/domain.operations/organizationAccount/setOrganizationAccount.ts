import {
  CreateAccountCommand,
  DescribeCreateAccountStatusCommand,
  TagResourceCommand,
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
 * .what = creates an organization account (finsert or upsert)
 * .why = accounts cannot be updated after creation, only created
 * .note
 *   - CreateAccount is async; this polls until completion
 *   - finsert returns foundBefore if email already exists (idempotent)
 *   - upsert syncs write-only tags when SYNC_WRITEONLY_TAGS=DeclaredAwsOrganizationAccount
 *   - fails fast if not authed as org manager (required for account creation)
 */
export const setOrganizationAccount = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsOrganizationAccount;
      upsert: DeclaredAwsOrganizationAccount;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsOrganizationAccount>> => {
    const desired = input.finsert ?? input.upsert;

    // failfast if neither provided
    if (!desired)
      BadRequestError.throw('finsert or upsert is required', { input });

    // get org client (fail-fast on non-org-manager auth)
    const { client, organization } = await getAwsOrganizationsClient(context);

    // validate that the desired org (if provided) matches the authed account's org
    if (
      desired.organization &&
      organization.managementAccount.id !==
        desired.organization.managementAccount.id
    )
      BadRequestError.throw(
        'organization mismatch: authed account org does not match desired organization',
        {
          desired: desired.organization.managementAccount.id,
          actual: organization.managementAccount.id,
        },
      );

    // check if already exists
    const foundBefore = await getOneOrganizationAccount(
      { by: { unique: { email: desired.email } } },
      context,
    );
    if (foundBefore) {
      // finsert: return existing (idempotent, no changes)
      if (input.finsert) return foundBefore;

      // upsert: sync write-only tags if env var is set (for backfilling existing accounts)
      const canSyncWriteonlyTags =
        process.env.SYNC_WRITEONLY_TAGS === 'DeclaredAwsOrganizationAccount';
      if (!canSyncWriteonlyTags) return foundBefore;

      const iamUserAccessToBilling = desired.iamUserAccessToBilling ?? 'ALLOW';
      const roleName = desired.roleName ?? 'OrganizationAccountAccessRole';
      await client.send(
        new TagResourceCommand({
          ResourceId: foundBefore.id,
          Tags: [
            {
              Key: '_decla_writeonly_iamUserAccessToBilling',
              Value: iamUserAccessToBilling,
            },
            { Key: '_decla_writeonly_roleName', Value: roleName },
          ],
        }),
      );
      // re-fetch to return updated tags
      return (
        (await getOneOrganizationAccount(
          { by: { primary: { id: foundBefore.id } } },
          context,
        )) ?? foundBefore
      );
    }

    // build tags including write-only values (AWS doesn't return these on read)
    const iamUserAccessToBilling = desired.iamUserAccessToBilling ?? 'ALLOW';
    const roleName = desired.roleName ?? 'OrganizationAccountAccessRole';
    const tags: Array<{ Key: string; Value: string }> = [
      // persist write-only values as tags so we can read them back
      {
        Key: '_decla_writeonly_iamUserAccessToBilling',
        Value: iamUserAccessToBilling,
      },
      { Key: '_decla_writeonly_roleName', Value: roleName },
      // include user-specified tags
      ...Object.entries(desired.tags ?? {}).map(([Key, Value]) => ({
        Key,
        Value,
      })),
    ];

    // create account (async operation)
    const createResponse = await client.send(
      new CreateAccountCommand({
        AccountName: desired.name,
        Email: desired.email,
        IamUserAccessToBilling: iamUserAccessToBilling,
        RoleName: roleName,
        Tags: tags,
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
