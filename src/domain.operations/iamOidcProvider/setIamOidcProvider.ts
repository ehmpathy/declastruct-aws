import {
  AddClientIDToOpenIDConnectProviderCommand,
  CreateOpenIDConnectProviderCommand,
  IAMClient,
  RemoveClientIDFromOpenIDConnectProviderCommand,
  TagOpenIDConnectProviderCommand,
  UntagOpenIDConnectProviderCommand,
  UpdateOpenIDConnectProviderThumbprintCommand,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import {
  type DeclaredAwsIamOidcProvider,
  OIDC_THUMBPRINT_PLACEHOLDER,
} from '@src/domain.objects/DeclaredAwsIamOidcProvider';

import { getOneIamOidcProvider } from './getOneIamOidcProvider';

/**
 * .what = creates or updates an iam oidc provider
 * .why = enables declarative oidc provider management for federated auth
 *
 * .note
 *   - oidc providers are identified by url (unique per account)
 *   - thumbprints can be updated after creation
 *   - client ids can be added/removed after creation
 */
export const setIamOidcProvider = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsIamOidcProvider;
      upsert: DeclaredAwsIamOidcProvider;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamOidcProvider>> => {
    const providerDesired = input.findsert ?? input.upsert;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // check whether it already exists
    const before = await getOneIamOidcProvider(
      { by: { unique: { url: providerDesired.url } } },
      context,
    );

    // if it's a findsert and had a before, then return that
    if (before && input.findsert) return before;

    // if exists + upsert, update the provider
    if (before && input.upsert) {
      // update thumbprints if changed
      const thumbprintsBefore = new Set(before.thumbprints);
      const thumbprintsDesired = new Set(providerDesired.thumbprints);
      const thumbprintsChanged =
        thumbprintsBefore.size !== thumbprintsDesired.size ||
        [...thumbprintsBefore].some((t) => !thumbprintsDesired.has(t));

      if (thumbprintsChanged) {
        await iam.send(
          new UpdateOpenIDConnectProviderThumbprintCommand({
            OpenIDConnectProviderArn: before.arn,
            ThumbprintList:
              providerDesired.thumbprints.length > 0
                ? providerDesired.thumbprints
                : [OIDC_THUMBPRINT_PLACEHOLDER],
          }),
        );
      }

      // update client ids - add missing ones
      const clientIdsBefore = new Set(before.clientIds);
      const clientIdsDesired = new Set(providerDesired.clientIds);

      for (const clientId of clientIdsDesired) {
        if (!clientIdsBefore.has(clientId)) {
          await iam.send(
            new AddClientIDToOpenIDConnectProviderCommand({
              OpenIDConnectProviderArn: before.arn,
              ClientID: clientId,
            }),
          );
        }
      }

      // remove client ids no longer desired
      for (const clientId of clientIdsBefore) {
        if (!clientIdsDesired.has(clientId)) {
          await iam.send(
            new RemoveClientIDFromOpenIDConnectProviderCommand({
              OpenIDConnectProviderArn: before.arn,
              ClientID: clientId,
            }),
          );
        }
      }

      // update tags if changed
      const desiredTags = providerDesired.tags ?? {};
      const tagsBefore = before.tags ?? {};

      // remove tags that are no longer desired
      const tagsToRemove = Object.keys(tagsBefore).filter(
        (key) => !(key in desiredTags),
      );
      if (tagsToRemove.length > 0) {
        await iam.send(
          new UntagOpenIDConnectProviderCommand({
            OpenIDConnectProviderArn: before.arn,
            TagKeys: tagsToRemove,
          }),
        );
      }

      // add/update tags
      const tagsToSet = Object.entries(desiredTags).filter(
        ([key, value]) => tagsBefore[key] !== value,
      );
      if (tagsToSet.length > 0) {
        await iam.send(
          new TagOpenIDConnectProviderCommand({
            OpenIDConnectProviderArn: before.arn,
            Tags: tagsToSet.map(([key, value]) => ({ Key: key, Value: value })),
          }),
        );
      }

      // fetch and return updated provider
      const updated = await getOneIamOidcProvider(
        { by: { unique: { url: providerDesired.url } } },
        context,
      );
      if (!updated)
        UnexpectedCodePathError.throw('provider disappeared after update', {
          providerDesired,
        });
      return updated;
    }

    // otherwise, create it
    const createResponse = await iam.send(
      new CreateOpenIDConnectProviderCommand({
        Url: providerDesired.url,
        ClientIDList: providerDesired.clientIds,
        ThumbprintList:
          providerDesired.thumbprints.length > 0
            ? providerDesired.thumbprints
            : [OIDC_THUMBPRINT_PLACEHOLDER],
        Tags: providerDesired.tags
          ? Object.entries(providerDesired.tags).map(([key, value]) => ({
              Key: key,
              Value: value,
            }))
          : undefined,
      }),
    );

    // failfast if arn not returned
    if (!createResponse.OpenIDConnectProviderArn)
      UnexpectedCodePathError.throw('no arn returned from create', {
        createResponse,
      });

    // fetch and return created provider
    const created = await getOneIamOidcProvider(
      { by: { primary: { arn: createResponse.OpenIDConnectProviderArn } } },
      context,
    );
    if (!created)
      UnexpectedCodePathError.throw('provider not found after creation', {
        providerDesired,
      });
    return created;
  },
);
