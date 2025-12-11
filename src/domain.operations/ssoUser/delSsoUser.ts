import {
  DeleteUserCommand,
  IdentitystoreClient,
} from '@aws-sdk/client-identitystore';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import { DeclaredAwsSsoUser } from '../../domain.objects/DeclaredAwsSsoUser';
import { getOneSsoInstance } from '../ssoInstance/getOneSsoInstance';
import { getOneSsoUser } from './getOneSsoUser';

/**
 * .what = deletes an sso user
 * .why = enables cleanup of identity center users
 *
 * .note
 *   - idempotent: no error if user doesn't exist
 *   - will fail if user has active assignments
 */
export const delSsoUser = asProcedure(
  async (
    input: {
      ref: Ref<typeof DeclaredAwsSsoUser>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
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

    // extract instance ref from user ref if available
    const instanceRef = isRefByUnique({ of: DeclaredAwsSsoUser })(input.ref)
      ? (input.ref as RefByUnique<typeof DeclaredAwsSsoUser>).instance
      : null;

    if (!instanceRef)
      UnexpectedCodePathError.throw(
        'cannot delete user without instance ref; use byUnique ref',
        { ref: input.ref },
      );

    const identityStoreId = await resolveIdentityStoreId(instanceRef);

    // create identitystore client
    const ids = new IdentitystoreClient({
      region: context.aws.credentials.region,
    });

    // lookup user to get id
    const user = await getOneSsoUser({ by: { ref: input.ref } }, context);

    // if doesn't exist, nothing to do (idempotent)
    if (!user) return;

    // delete the user
    try {
      await ids.send(
        new DeleteUserCommand({
          IdentityStoreId: identityStoreId,
          UserId: user.id,
        }),
      );
    } catch (error) {
      // ignore if already deleted
      if (error instanceof Error && error.name === 'ResourceNotFoundException')
        return;
      throw error;
    }
  },
);
