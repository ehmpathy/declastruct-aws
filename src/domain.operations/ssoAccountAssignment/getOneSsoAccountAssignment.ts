import {
  ListAccountAssignmentsCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByUnique,
  type Ref,
  type RefByUnique,
} from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
import { getRefByPrimaryOfOrganizationAccount } from '../organizationAccount/getRefByPrimaryOfOrganizationAccount';
import { getOneSsoInstance } from '../ssoInstance/getOneSsoInstance';
import { getRefByPrimaryOfSsoPermissionSet } from '../ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import { getRefByPrimaryOfSsoUser } from '../ssoUser/getRefByPrimaryOfSsoUser';
import { castIntoDeclaredAwsSsoAccountAssignment } from './castIntoDeclaredAwsSsoAccountAssignment';

/**
 * .what = retrieves an sso account assignment from aws
 * .why = enables lookup by unique key (the only supported lookup for assignments)
 *
 * .note = assignments don't have a single id; identified by composite unique key
 */
export const getOneSsoAccountAssignment = asProcedure(
  async (
    input: {
      by: PickOne<{
        unique: RefByUnique<typeof DeclaredAwsSsoAccountAssignment>;
        ref: Ref<typeof DeclaredAwsSsoAccountAssignment>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoAccountAssignment> | null> => {
    // resolve ref to unique
    const by = (() => {
      if (input.by.unique) return input.by.unique;
      if (input.by.ref) {
        if (
          isRefByUnique({ of: DeclaredAwsSsoAccountAssignment })(input.by.ref)
        )
          return input.by.ref;
      }
      throw new BadRequestError('Invalid ref type - must be unique ref', {
        input,
      });
    })();

    // resolve instance from ref
    const instance =
      (await getOneSsoInstance({ by: { ref: by.instance } }, context)) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        by,
      });

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // resolve permission set to primary ref (with arn)
    const permissionSetRef = await getRefByPrimaryOfSsoPermissionSet(
      { ref: by.permissionSet },
      context,
    );

    // return null if permission set not found
    if (!permissionSetRef) return null;

    // resolve principal to primary ref (with id)
    const principalRef = await getRefByPrimaryOfSsoUser(
      { ref: by.principal },
      context,
    );

    // return null if principal not found
    if (!principalRef) return null;

    // resolve target account to primary ref (with id)
    const targetAccountRef = await getRefByPrimaryOfOrganizationAccount(
      { ref: by.target },
      context,
    );

    // list assignments for this account and permission set
    try {
      const response = await sso.send(
        new ListAccountAssignmentsCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetRef.arn,
          AccountId: targetAccountRef.id,
        }),
      );

      // find matching assignment
      const assignment = response.AccountAssignments?.find(
        (a) =>
          a.PrincipalType === by.principalType &&
          a.PrincipalId === principalRef.id,
      );

      if (!assignment) return null;

      // cast to domain format
      return castIntoDeclaredAwsSsoAccountAssignment({
        response: assignment,
        instance: by.instance,
        permissionSet: by.permissionSet,
        principal: by.principal,
        target: by.target,
      });
    } catch (error) {
      // return null if not found
      if (error instanceof Error && error.name === 'ResourceNotFoundException')
        return null;
      throw error;
    }
  },
);
