import {
  DescribePolicyCommand,
  ListPoliciesCommand,
  ListTagsForResourceCommand,
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
import { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';

import { castIntoDeclaredAwsOrganizationServiceControlPolicy } from './castIntoDeclaredAwsOrganizationServiceControlPolicy';

/**
 * .what = retrieves an SCP by primary (id), unique (name), or ref
 * .why = enables lookup by policy id or name
 * .note
 *   - by primary (id): uses DescribePolicy directly
 *   - by unique (name): lists policies and finds by name, then describes
 *   - returns null if policy not found
 */
export const getOneOrganizationServiceControlPolicy = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<
          typeof DeclaredAwsOrganizationServiceControlPolicy
        >;
        unique: RefByUnique<typeof DeclaredAwsOrganizationServiceControlPolicy>;
        ref: Ref<typeof DeclaredAwsOrganizationServiceControlPolicy>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<
    typeof DeclaredAwsOrganizationServiceControlPolicy
  > | null> => {
    // handle by ref using type guards
    if (input.by.ref) {
      if (
        isRefByUnique({ of: DeclaredAwsOrganizationServiceControlPolicy })(
          input.by.ref,
        )
      )
        return getOneOrganizationServiceControlPolicy(
          { by: { unique: input.by.ref } },
          context,
        );
      if (
        isRefByPrimary({ of: DeclaredAwsOrganizationServiceControlPolicy })(
          input.by.ref,
        )
      )
        return getOneOrganizationServiceControlPolicy(
          { by: { primary: input.by.ref } },
          context,
        );
      BadRequestError.throw('ref is neither unique nor primary', { input });
    }

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // derive policy id from input
      let policyId: string;

      if (input.by.primary) {
        policyId = input.by.primary.id;
      } else if (input.by.unique) {
        // find policy by name via listing
        const policyFound = await findPolicyByName({
          client,
          name: input.by.unique.name,
        });
        if (!policyFound) return null;
        policyId = policyFound.Id!;
      } else {
        BadRequestError.throw('must provide primary, unique, or ref', {
          input,
        });
      }

      // describe the policy to get full content
      const response = await client.send(
        new DescribePolicyCommand({ PolicyId: policyId }),
      );

      if (!response.Policy) return null;

      // fetch tags
      const tagsResponse = await client.send(
        new ListTagsForResourceCommand({
          ResourceId: policyId,
        }),
      );

      // cast to domain object
      return castIntoDeclaredAwsOrganizationServiceControlPolicy({
        policy: response.Policy,
        tags: tagsResponse.Tags,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle policy not found
      if (error.name === 'PolicyNotFoundException') return null;

      throw new HelpfulError(
        'aws.getOneOrganizationServiceControlPolicy error',
        {
          cause: error,
          context: {
            errorName: error.name,
            errorMessage: error.message,
            input,
          },
        },
      );
    }
  },
);

/**
 * .what = finds a policy by name via paginated ListPolicies
 * .why = AWS does not support lookup by name directly
 * .note = throws ConstraintError if duplicate names detected (policies created outside declastruct)
 */
const findPolicyByName = async (input: {
  client: OrganizationsClient;
  name: string;
}): Promise<{ Id: string; Name: string } | null> => {
  let nextToken: string | undefined;
  const matches: Array<{ Id: string; Name: string }> = [];

  // collect all policies with matched name
  do {
    const response = await input.client.send(
      new ListPoliciesCommand({
        Filter: 'SERVICE_CONTROL_POLICY',
        NextToken: nextToken,
      }),
    );

    const found = response.Policies?.filter((p) => p.Name === input.name) ?? [];
    for (const p of found) {
      if (p.Id) matches.push({ Id: p.Id, Name: p.Name! });
    }

    nextToken = response.NextToken;
  } while (nextToken);

  // no matches found
  if (matches.length === 0) return null;

  // duplicate names detected — constraint violation
  if (matches.length > 1) {
    throw new BadRequestError(
      'duplicate SCP names detected — declastruct requires unique names',
      {
        name: input.name,
        duplicates: matches.map((m) => m.Id),
        hint: 'rename or delete duplicate policies created outside declastruct',
      },
    );
  }

  return matches[0]!;
};
