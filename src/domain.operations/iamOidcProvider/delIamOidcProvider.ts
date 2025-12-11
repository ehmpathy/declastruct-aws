import {
  DeleteOpenIDConnectProviderCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { Ref } from 'domain-objects';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsIamOidcProvider } from '../../domain.objects/DeclaredAwsIamOidcProvider';
import { getOneIamOidcProvider } from './getOneIamOidcProvider';

/**
 * .what = deletes an iam oidc provider
 * .why = enables cleanup of federated identity providers
 *
 * .note
 *   - idempotent: no error if provider doesn't exist
 */
export const delIamOidcProvider = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsIamOidcProvider>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // lookup provider to get arn
    const provider = await getOneIamOidcProvider(
      { by: { ref: input.ref } },
      context,
    );

    // if doesn't exist, nothing to do (idempotent)
    if (!provider) return;

    // delete the provider
    try {
      await iam.send(
        new DeleteOpenIDConnectProviderCommand({
          OpenIDConnectProviderArn: provider.arn,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return;
      throw error;
    }
  },
);
