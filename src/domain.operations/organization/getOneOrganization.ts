import {
  DescribeOrganizationCommand,
  OrganizationsClient,
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
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';

import { castIntoDeclaredAwsOrganization } from './castIntoDeclaredAwsOrganization';

/**
 * .what = retrieves the organization by auth, unique, or primary key
 * .why = enables lookup by id (primary), managementAccount (unique), or auth (current credentials)
 * .note
 *   - Organizations API only returns the org for the current credentials
 *   - validates that the requested org matches the authed account's org
 *   - returns null if caller is not in an organization or if ref doesn't match
 */
export const getOneOrganization = asProcedure(
  async (
    input: {
      by: PickOne<{
        auth: true;
        primary: RefByPrimary<typeof DeclaredAwsOrganization>;
        unique: RefByUnique<typeof DeclaredAwsOrganization>;
        ref: Ref<typeof DeclaredAwsOrganization>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsOrganization> | null> => {
    // handle by ref using type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsOrganization })(input.by.ref))
        return getOneOrganization({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsOrganization })(input.by.ref))
        return getOneOrganization({ by: { primary: input.by.ref } }, context);
      BadRequestError.throw('ref is neither unique nor primary', { input });
    }

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // fetch the organization for the current credentials
      const response = await client.send(new DescribeOrganizationCommand({}));

      // return null if no organization
      if (!response.Organization) return null;

      // cast to domain object
      const found = castIntoDeclaredAwsOrganization(response.Organization);

      // by auth: return directly (no validation needed)
      if (input.by.auth) return found;

      // validate by primary: ensure id matches
      if (input.by.primary && found.id !== input.by.primary.id) return null;

      // validate by unique: ensure managementAccount id matches
      if (
        input.by.unique &&
        found.managementAccount.id !== input.by.unique.managementAccount.id
      )
        return null;

      return found;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle not in organization
      if (error.name === 'AWSOrganizationsNotInUseException') return null;

      throw new HelpfulError('aws.getOneOrganization error', {
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
