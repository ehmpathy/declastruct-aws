import {
  GetOpenIDConnectProviderCommand,
  IAMClient,
  ListOpenIDConnectProvidersCommand,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsIamOidcProvider } from '@src/domain.objects/DeclaredAwsIamOidcProvider';

import { castIntoDeclaredAwsIamOidcProvider } from './castIntoDeclaredAwsIamOidcProvider';

/**
 * .what = lists all iam oidc providers in the account
 * .why = enables discovery and enumeration of configured identity providers
 */
export const getAllIamOidcProviders = asProcedure(
  async (
    _input: Record<string, never>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamOidcProvider>[]> => {
    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // list all providers
    const listResponse = await iam.send(
      new ListOpenIDConnectProvidersCommand({}),
    );

    // get details for each provider
    const providers: HasReadonly<typeof DeclaredAwsIamOidcProvider>[] = [];

    for (const provider of listResponse.OpenIDConnectProviderList ?? []) {
      if (!provider.Arn) continue;

      // get full provider details
      const detailResponse = await iam.send(
        new GetOpenIDConnectProviderCommand({
          OpenIDConnectProviderArn: provider.Arn,
        }),
      );

      // cast to domain format
      providers.push(
        castIntoDeclaredAwsIamOidcProvider({
          response: detailResponse,
          arn: provider.Arn,
        }),
      );
    }

    return providers;
  },
);
