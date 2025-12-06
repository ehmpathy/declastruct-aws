import { OrganizationsClient } from '@aws-sdk/client-organizations';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganization } from '../../domain.objects/DeclaredAwsOrganization';
import { getOneOrganization } from '../../domain.operations/organization/getOneOrganization';

/**
 * .what = creates an OrganizationsClient with org manager auth check
 * .why = encapsulates fail-fast pattern for operations requiring org manager auth
 * .note = returns both client and organization for downstream use
 */
export const getAwsOrganizationsClient = async (
  context: ContextAwsApi & VisualogicContext,
): Promise<{
  client: OrganizationsClient;
  organization: HasReadonly<typeof DeclaredAwsOrganization>;
}> => {
  // fail-fast: require org manager auth
  const organization = await getOneOrganization(
    { by: { auth: true } },
    context,
  );
  if (!organization)
    BadRequestError.throw(
      'org manager auth required to use organizations client',
    );

  // declare the client
  const client = new OrganizationsClient({
    region: context.aws.credentials.region,
  });

  return { client, organization };
};
