import { CloseAccountCommand } from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsOrganizationsClient } from '../../access/sdks/getAwsOrganizationsClient';
import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import { getOneOrganizationAccount } from './getOneOrganizationAccount';

/**
 * .what = closes an organization account
 * .why = accounts cannot be deleted, only closed (transitions to SUSPENDED)
 * .note
 *   - async operation
 *   - idempotent: already closed accounts return success
 *   - 90-day grace period for reinstatement
 *   - fails fast if not authed as org manager (required for account operations)
 */
export const delOrganizationAccount = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsOrganizationAccount>;
        unique: RefByUnique<typeof DeclaredAwsOrganizationAccount>;
        ref: Ref<typeof DeclaredAwsOrganizationAccount>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ closed: true }> => {
    // resolve ref
    const by = (() => {
      if (input.by.primary) return { primary: input.by.primary };
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (isRefByUnique({ of: DeclaredAwsOrganizationAccount })(input.by.ref))
          return { unique: input.by.ref };
        if (
          isRefByPrimary({ of: DeclaredAwsOrganizationAccount })(input.by.ref)
        )
          return { primary: input.by.ref };
      }
      throw new BadRequestError('Invalid ref type', { input });
    })();

    // get org client (fail-fast on non-org-manager auth)
    const { client } = await getAwsOrganizationsClient(context);

    // get the account
    const foundBefore = await getOneOrganizationAccount({ by }, context);

    // idempotent: not found or already closed
    if (!foundBefore) return { closed: true };
    if (foundBefore.state === 'SUSPENDED' || foundBefore.state === 'CLOSED') {
      return { closed: true };
    }
    if (foundBefore.state === 'PENDING_CLOSURE') {
      return { closed: true }; // already in progress
    }

    // validate that the foundBefore account matches the requested account
    if (by.primary && foundBefore.id !== by.primary.id)
      BadRequestError.throw(
        'account id mismatch: found account does not match requested account',
        { requested: by.primary.id, actual: foundBefore.id },
      );

    if (by.unique && foundBefore.email !== by.unique.email)
      BadRequestError.throw(
        'account email mismatch: found account does not match requested account',
        { requested: by.unique.email, actual: foundBefore.email },
      );

    // cannot close non-active accounts
    if (foundBefore.state !== 'ACTIVE')
      BadRequestError.throw('Can only close ACTIVE accounts', {
        currentState: foundBefore.state,
      });

    try {
      await client.send(new CloseAccountCommand({ AccountId: foundBefore.id }));
      return { closed: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already closed
      if (error.name === 'AccountAlreadyClosedException') {
        return { closed: true };
      }

      throw new HelpfulError('aws.delOrganizationAccount error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          input,
        },
      });
    }
  },
);
