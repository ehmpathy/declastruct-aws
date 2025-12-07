import {
  GetOpenIDConnectProviderCommand,
  IAMClient,
  ListOpenIDConnectProvidersCommand,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamOidcProvider } from '../../domain.objects/DeclaredAwsIamOidcProvider';
import { castIntoDeclaredAwsIamOidcProvider } from './castIntoDeclaredAwsIamOidcProvider';

/**
 * .what = retrieves an iam oidc provider from aws
 * .why = enables lookup by primary (arn) or unique (url)
 */
export const getOneIamOidcProvider = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsIamOidcProvider>;
        unique: RefByUnique<typeof DeclaredAwsIamOidcProvider>;
        ref: Ref<typeof DeclaredAwsIamOidcProvider>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamOidcProvider> | null> => {
    // resolve ref to primary or unique
    const by = await (async () => {
      // passthrough if not ref
      if (!input.by.ref) return input.by;

      // route to unique if ref is by unique
      if (isRefByUnique({ of: DeclaredAwsIamOidcProvider })(input.by.ref))
        return { unique: input.by.ref };

      // route to primary if ref is by primary
      if (isRefByPrimary({ of: DeclaredAwsIamOidcProvider })(input.by.ref))
        return { primary: input.by.ref };

      // failfast if ref is neither unique nor primary
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        { input },
      );
    })();

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // resolve arn for lookup
    const providerArn = await (async () => {
      // if by primary, use arn directly
      if (by.primary) return by.primary.arn;

      // if by unique, need to list providers and find matching url
      if (by.unique) {
        const listResponse = await iam.send(
          new ListOpenIDConnectProvidersCommand({}),
        );

        // normalize url for comparison
        const normalizedUrl = by.unique.url
          .replace(/^https?:\/\//, '')
          .toLowerCase();

        // find provider with matching url
        for (const provider of listResponse.OpenIDConnectProviderList ?? []) {
          if (!provider.Arn) continue;

          // get provider details to check url
          const detailResponse = await iam.send(
            new GetOpenIDConnectProviderCommand({
              OpenIDConnectProviderArn: provider.Arn,
            }),
          );

          // compare urls (normalize both)
          const providerUrl = (detailResponse.Url ?? '')
            .replace(/^https?:\/\//, '')
            .toLowerCase();

          if (providerUrl === normalizedUrl) return provider.Arn;
        }

        // not found by url
        return null;
      }

      // failfast if neither
      return UnexpectedCodePathError.throw('could not resolve provider arn', {
        by,
      });
    })();

    // return null if not found
    if (!providerArn) return null;

    // get provider details
    try {
      const response = await iam.send(
        new GetOpenIDConnectProviderCommand({
          OpenIDConnectProviderArn: providerArn,
        }),
      );

      // cast to domain format
      return castIntoDeclaredAwsIamOidcProvider({ response, arn: providerArn });
    } catch (error) {
      // return null if provider not found
      if (error instanceof Error && error.name === 'NoSuchEntityException')
        return null;
      throw error;
    }
  },
);
