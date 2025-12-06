import {
  DeleteOrganizationCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
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

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
import { getOneOrganization } from './getOneOrganization';

/**
 * .what = deletes the organization
 * .why = enables cleanup of organization resources
 * .note
 *   - can only delete if all member accounts have been removed
 *   - validates that the desired org matches the authed account's org
 *   - idempotent: returns success if already deleted
 */
export const delOrganization = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsOrganization>;
        unique: RefByUnique<typeof DeclaredAwsOrganization>;
        ref: Ref<typeof DeclaredAwsOrganization>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<{ deleted: true }> => {
    // resolve ref to consistent by structure
    const by = (() => {
      if (input.by.primary) return { primary: input.by.primary };
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (isRefByUnique({ of: DeclaredAwsOrganization })(input.by.ref))
          return { unique: input.by.ref };
        if (isRefByPrimary({ of: DeclaredAwsOrganization })(input.by.ref))
          return { primary: input.by.ref };
      }
      BadRequestError.throw('ref is neither unique nor primary', { input });
    })();

    // get the organization for the current credentials
    const foundBefore = await getOneOrganization({ by }, context);

    // if not found, return success (idempotent)
    if (!foundBefore) return { deleted: true };

    // validate that the foundBefore org matches the requested org
    // this ensures we don't blindly delete the wrong org
    if (by.primary && foundBefore.id !== by.primary.id)
      BadRequestError.throw(
        'organization id mismatch: authed account org does not match requested org',
        { requested: by.primary.id, actual: foundBefore.id },
      );

    if (
      by.unique &&
      foundBefore.managementAccount.id !== by.unique.managementAccount.id
    )
      BadRequestError.throw(
        'organization managementAccount mismatch: authed account org does not match requested org',
        {
          requested: by.unique.managementAccount.id,
          actual: foundBefore.managementAccount.id,
        },
      );

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      await client.send(new DeleteOrganizationCommand({}));
      return { deleted: true };
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already deleted
      if (error.name === 'AWSOrganizationsNotInUseException') {
        return { deleted: true };
      }

      throw new HelpfulError('aws.delOrganization error', {
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
