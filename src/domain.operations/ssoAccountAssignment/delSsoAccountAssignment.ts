import {
  DeleteAccountAssignmentCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import { isRefByUnique, type Ref, type RefByUnique } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
import { getRefByPrimaryOfOrganizationAccount } from '../organizationAccount/getRefByPrimaryOfOrganizationAccount';
import { getOneSsoInstance } from '../ssoInstance/getOneSsoInstance';
import { getRefByPrimaryOfSsoPermissionSet } from '../ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import { getRefByPrimaryOfSsoUser } from '../ssoUser/getRefByPrimaryOfSsoUser';
import { getOneSsoAccountAssignment } from './getOneSsoAccountAssignment';

/**
 * .what = deletes an sso account assignment
 * .why = enables cleanup of account assignments
 *
 * .note
 *   - idempotent: no error if assignment doesn't exist
 *   - no primary key on assignments, so only unique/ref lookups are supported
 */
export const delSsoAccountAssignment = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsSsoAccountAssignment>;
        ref: Ref<typeof DeclaredAwsSsoAccountAssignment>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<void> => {
    // resolve ref to unique
    const by = (() => {
      if (input.by.unique) return { unique: input.by.unique };
      if (input.by.ref) {
        if (
          isRefByUnique({ of: DeclaredAwsSsoAccountAssignment })(input.by.ref)
        )
          return { unique: input.by.ref };
      }
      throw new BadRequestError('Invalid ref type - must be unique ref', {
        input,
      });
    })();

    // check if assignment exists
    const assignment = await getOneSsoAccountAssignment(
      { by: { unique: by.unique } },
      context,
    );

    // if doesn't exist, nothing to do (idempotent)
    if (!assignment) return;

    // resolve instance
    const instance =
      (await getOneSsoInstance({ by: { ref: by.unique.instance } }, context)) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        instanceRef: by.unique.instance,
      });

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // resolve permission set to primary ref (with arn)
    const permissionSetRef = await getRefByPrimaryOfSsoPermissionSet(
      { ref: by.unique.permissionSet },
      context,
    );

    // if permission set not found, nothing to delete (idempotent)
    if (!permissionSetRef) return;

    // resolve principal to primary ref (with id)
    const principalRef = await getRefByPrimaryOfSsoUser(
      { ref: by.unique.principal },
      context,
    );

    // if principal not found, nothing to delete (idempotent)
    if (!principalRef) return;

    // resolve target account to primary ref (with id)
    const targetAccountRef = await getRefByPrimaryOfOrganizationAccount(
      { ref: by.unique.target },
      context,
    );

    // delete the assignment
    try {
      await sso.send(
        new DeleteAccountAssignmentCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetRef.arn,
          PrincipalType: by.unique.principalType,
          PrincipalId: principalRef.id,
          TargetType: by.unique.targetType,
          TargetId: targetAccountRef.id,
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
