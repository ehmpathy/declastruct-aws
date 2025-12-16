import {
  CreateOrganizationCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';

import { castIntoDeclaredAwsOrganization } from './castIntoDeclaredAwsOrganization';
import { getOneOrganization } from './getOneOrganization';

/**
 * .what = creates an organization (findsert only)
 * .why = organizations cannot be updated, only created
 * .note
 *   - can only have one organization per management account
 *   - findsert returns foundBefore if already exists (idempotent)
 *   - validates that managementAccount matches the authed account
 */
export const setOrganization = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsOrganization;
      // Note: upsert not supported — organizations cannot be updated
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsOrganization>> => {
    const desired = input.findsert;

    // failfast if findsert not provided
    if (!desired)
      BadRequestError.throw(
        'findsert is required (organizations cannot be updated)',
      );

    // validate that managementAccount matches the authed account
    const currentAccountId = context.aws.credentials.account;
    if (currentAccountId !== desired.managementAccount.id)
      BadRequestError.throw(
        'managementAccount mismatch: desired managementAccount.id does not match authed account id',
        {
          desired: desired.managementAccount.id,
          actual: currentAccountId,
        },
      );

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // check if already exists (idempotent findsert)
    const foundBefore = await getOneOrganization(
      { by: { unique: { managementAccount: desired.managementAccount } } },
      context,
    );
    if (foundBefore) return foundBefore;

    try {
      const response = await client.send(
        new CreateOrganizationCommand({
          FeatureSet: desired.featureSet,
        }),
      );

      // fail if no organization returned
      if (!response.Organization)
        HelpfulError.throw('CreateOrganization did not return organization', {
          response,
        });

      // cast the result
      const foundAfter = castIntoDeclaredAwsOrganization(response.Organization);

      // validate that the created org's managementAccount matches the desired
      if (foundAfter.managementAccount.id !== desired.managementAccount.id)
        BadRequestError.throw(
          'created organization managementAccount does not match desired: authed account does not match desired managementAccount',
          {
            desired: desired.managementAccount,
            actual: foundAfter.managementAccount,
          },
        );

      return foundAfter;
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already in organization
      if (error.name === 'AlreadyInOrganizationException') {
        const foundAfter = await getOneOrganization(
          { by: { unique: { managementAccount: desired.managementAccount } } },
          context,
        );
        if (foundAfter) return foundAfter;
      }

      throw new HelpfulError('aws.setOrganization error', {
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
