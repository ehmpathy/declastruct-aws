import {
  IdentitystoreClient,
  ListUsersCommand,
} from '@aws-sdk/client-identitystore';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoUser } from '@src/domain.objects/DeclaredAwsSsoUser';
import { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import { castIntoDeclaredAwsSsoUser } from './castIntoDeclaredAwsSsoUser';

/**
 * .what = lists all sso users in the identity store
 * .why = enables discovery and enumeration of configured users
 */
export const getAllSsoUsers = asProcedure(
  async (
    input: {
      where: {
        instance: Ref<typeof DeclaredAwsSsoInstance>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoUser>[]> => {
    // resolve instance from ref
    const instance =
      (await getOneSsoInstance(
        { by: { ref: input.where.instance } },
        context,
      )) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        instanceRef: input.where.instance,
      });

    // create identitystore client
    const ids = new IdentitystoreClient({
      region: context.aws.credentials.region,
    });

    // list all users with pagination
    const users: HasReadonly<typeof DeclaredAwsSsoUser>[] = [];
    let nextToken: string | undefined;

    do {
      const response = await ids.send(
        new ListUsersCommand({
          IdentityStoreId: instance.identityStoreId,
          NextToken: nextToken,
        }),
      );

      // cast each user to domain format
      for (const user of response.Users ?? []) {
        users.push(castIntoDeclaredAwsSsoUser({ response: user, instance }));
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return users;
  },
);
