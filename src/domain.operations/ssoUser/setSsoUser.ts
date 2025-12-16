import {
  type AttributeOperation,
  CreateUserCommand,
  IdentitystoreClient,
  UpdateUserCommand,
} from '@aws-sdk/client-identitystore';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';
import { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import { getOneSsoUser } from './getOneSsoUser';

/**
 * .what = creates or updates an sso user
 * .why = enables declarative user management for identity center
 *
 * .note
 *   - users are identified by instance + userName (unique per store)
 *   - email and name can be updated after creation
 */
export const setSsoUser = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsoUser;
      upsert: DeclaredAwsSsoUser;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoUser>> => {
    const userDesired = input.findsert ?? input.upsert;

    // resolve identityStoreId from instance ref
    const resolveIdentityStoreId = async (
      instanceRef: Ref<typeof DeclaredAwsSsoInstance>,
    ): Promise<string> => {
      const instance =
        (await getOneSsoInstance({ by: { ref: instanceRef } }, context)) ??
        UnexpectedCodePathError.throw('sso instance not found', {
          instanceRef,
        });
      return instance.identityStoreId;
    };

    const identityStoreId = await resolveIdentityStoreId(userDesired.instance);

    // create identitystore client
    const ids = new IdentitystoreClient({
      region: context.aws.credentials.region,
    });

    // check whether it already exists
    const before = await getOneSsoUser(
      {
        by: {
          unique: {
            instance: userDesired.instance,
            userName: userDesired.userName,
          },
        },
      },
      context,
    );

    // if it's a findsert and had a before, then return that
    if (before && input.findsert) return before;

    // if exists + upsert, update the user
    if (before && input.upsert) {
      const operations: AttributeOperation[] = [];

      // update display name if changed
      if (before.displayName !== userDesired.displayName) {
        operations.push({
          AttributePath: 'displayName',
          AttributeValue: userDesired.displayName,
        });
      }

      // update name if changed
      if (before.givenName !== userDesired.givenName && userDesired.givenName) {
        operations.push({
          AttributePath: 'name.givenName',
          AttributeValue: userDesired.givenName,
        });
      }
      if (
        before.familyName !== userDesired.familyName &&
        userDesired.familyName
      ) {
        operations.push({
          AttributePath: 'name.familyName',
          AttributeValue: userDesired.familyName,
        });
      }

      // apply updates if any

      if (operations.length > 0) {
        await UnexpectedCodePathError.wrap(
          async () => {
            await ids.send(
              new UpdateUserCommand({
                IdentityStoreId: identityStoreId,
                UserId: before.id,
                Operations: operations,
              }),
            );
          },
          {
            message: 'setSsoUser.update.error',
            metadata: { userDesired, operations },
          },
        )();
      }

      // fetch and return updated user
      return (
        (await getOneSsoUser(
          {
            by: {
              unique: {
                instance: userDesired.instance,
                userName: userDesired.userName,
              },
            },
          },
          context,
        )) ??
        UnexpectedCodePathError.throw('user disappeared after update', {
          userDesired,
        })
      );
    }

    // otherwise, create it
    const createResponse = await ids.send(
      new CreateUserCommand({
        IdentityStoreId: identityStoreId,
        UserName: userDesired.userName,
        DisplayName: userDesired.displayName,
        Name:
          userDesired.givenName || userDesired.familyName
            ? {
                GivenName: userDesired.givenName,
                FamilyName: userDesired.familyName,
              }
            : undefined,
        Emails: [
          {
            Value: userDesired.email,
            Primary: true,
          },
        ],
      }),
    );

    // failfast if id not returned
    if (!createResponse.UserId)
      UnexpectedCodePathError.throw('no id returned from create', {
        createResponse,
      });

    // fetch and return created user
    return (
      (await getOneSsoUser(
        {
          by: {
            unique: {
              instance: userDesired.instance,
              userName: userDesired.userName,
            },
          },
        },
        context,
      )) ??
      UnexpectedCodePathError.throw('user not found after creation', {
        userDesired,
      })
    );
  },
);
