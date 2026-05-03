import {
  DisablePolicyTypeCommand,
  EnablePolicyTypeCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import { HelpfulError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationPolicyEligibility } from '@src/domain.objects/DeclaredAwsOrganizationPolicyEligibility';
import { getOrganizationRootId } from '@src/domain.operations/organization/getOrganizationRootId';

import { getOneOrganizationPolicyEligibility } from './getOneOrganizationPolicyEligibility';

/**
 * .what = enables or disables a policy type in the organization
 * .why = required before create/attach of policies of that type
 * .note
 *   - idempotent: returns extant if already in desired state
 */
export const setOrganizationPolicyEligibility = asProcedure(
  async (
    input: {
      findsert: DeclaredAwsOrganizationPolicyEligibility;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<DeclaredAwsOrganizationPolicyEligibility> => {
    const desired = input.findsert;

    // check current state
    const found = await getOneOrganizationPolicyEligibility(
      { by: { unique: { type: desired.type } } },
      context,
    );
    const currentlyEnabled = found?.choice === 'ENABLED';

    // already in desired state
    if (desired.choice === 'ENABLED' && currentlyEnabled) return found;
    if (desired.choice === 'DISABLED' && !currentlyEnabled) {
      return new DeclaredAwsOrganizationPolicyEligibility({
        type: desired.type,
        choice: 'DISABLED',
      });
    }

    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // get root id for enable/disable call
    const rootId = await getOrganizationRootId({ by: { auth: true } }, context);
    if (!rootId) {
      throw new HelpfulError('not in an organization', { context: { input } });
    }

    try {
      if (desired.choice === 'ENABLED') {
        await client.send(
          new EnablePolicyTypeCommand({
            RootId: rootId,
            PolicyType: desired.type,
          }),
        );
      } else {
        await client.send(
          new DisablePolicyTypeCommand({
            RootId: rootId,
            PolicyType: desired.type,
          }),
        );
      }

      return new DeclaredAwsOrganizationPolicyEligibility({
        type: desired.type,
        choice: desired.choice,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already in desired state
      if (
        error.name === 'PolicyTypeAlreadyEnabledException' ||
        error.name === 'PolicyTypeNotEnabledException'
      ) {
        return new DeclaredAwsOrganizationPolicyEligibility({
          type: desired.type,
          choice: desired.choice,
        });
      }

      throw new HelpfulError('aws.setOrganizationPolicyEligibility error', {
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
