import type { GetOpenIDConnectProviderCommandOutput } from '@aws-sdk/client-iam';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import {
  DeclaredAwsIamOidcProvider,
  OIDC_THUMBPRINT_PLACEHOLDER,
} from '../../domain.objects/DeclaredAwsIamOidcProvider';

/**
 * .what = transforms aws sdk GetOpenIDConnectProviderCommandOutput to DeclaredAwsIamOidcProvider
 * .why = ensures type safety and readonly field enforcement
 */
export const castIntoDeclaredAwsIamOidcProvider = (input: {
  response: GetOpenIDConnectProviderCommandOutput;
  arn: string;
}): HasReadonly<typeof DeclaredAwsIamOidcProvider> => {
  const { response, arn } = input;
  // failfast if url is not defined
  if (!response.Url)
    UnexpectedCodePathError.throw(
      'oidc provider lacks url; cannot cast to domain object',
      { response },
    );

  // parse tags (only include if present)
  const tags = response.Tags?.length
    ? response.Tags.reduce(
        (acc, tag) => {
          if (tag.Key && tag.Value) acc[tag.Key] = tag.Value;
          return acc;
        },
        {} as Record<string, string>,
      )
    : undefined;

  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsIamOidcProvider.as({
      arn,
      url: response.Url.startsWith('https://')
        ? response.Url
        : `https://${response.Url}`,
      clientIds: response.ClientIDList ?? [],
      thumbprints: (response.ThumbprintList ?? []).filter(
        (t) => t !== OIDC_THUMBPRINT_PLACEHOLDER,
      ),
      ...(tags !== undefined && { tags }),
    }),
    hasReadonly({ of: DeclaredAwsIamOidcProvider }),
  );
};
