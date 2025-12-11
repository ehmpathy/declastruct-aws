import {
  ListAccountAssignmentsCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, Ref, RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganizationAccount } from '../../domain.objects/DeclaredAwsOrganizationAccount';
import type { DeclaredAwsSsoAccountAssignment } from '../../domain.objects/DeclaredAwsSsoAccountAssignment';
import type { DeclaredAwsSsoInstance } from '../../domain.objects/DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
import type { DeclaredAwsSsoUser } from '../../domain.objects/DeclaredAwsSsoUser';
import { getRefByPrimaryOfOrganizationAccount } from '../organizationAccount/getRefByPrimaryOfOrganizationAccount';
import { getOneSsoInstance } from '../ssoInstance/getOneSsoInstance';
import { getRefByPrimaryOfSsoPermissionSet } from '../ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import { getAllSsoUsers } from '../ssoUser/getAllSsoUsers';
import { castIntoDeclaredAwsSsoAccountAssignment } from './castIntoDeclaredAwsSsoAccountAssignment';

/**
 * .what = lists all sso account assignments for an account and permission set
 * .why = enables discovery and enumeration of configured assignments
 *
 * .note = must provide target account and permission set to query assignments (AWS API requirement)
 */
export const getAllSsoAccountAssignments = asProcedure(
  async (
    input: {
      where: {
        instance: Ref<typeof DeclaredAwsSsoInstance>;
        permissionSet: Ref<typeof DeclaredAwsSsoPermissionSet>;
        target: Ref<typeof DeclaredAwsOrganizationAccount>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoAccountAssignment>[]> => {
    // resolve instance from ref
    const instance =
      (await getOneSsoInstance(
        { by: { ref: input.where.instance } },
        context,
      )) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        instanceRef: input.where.instance,
      });

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // resolve permission set arn from ref
    const permissionSetRef = await getRefByPrimaryOfSsoPermissionSet(
      { ref: input.where.permissionSet },
      context,
    );

    // return empty if permission set not found
    if (!permissionSetRef) return [];

    // resolve target account id from ref
    const targetAccountRef = await getRefByPrimaryOfOrganizationAccount(
      { ref: input.where.target },
      context,
    );

    // build instance unique ref
    const instanceRef: RefByUnique<typeof DeclaredAwsSsoInstance> = {
      ownerAccount: instance.ownerAccount,
    };

    // get all users to create id -> unique ref mapping
    const users = await getAllSsoUsers(
      { where: { instance: input.where.instance } },
      context,
    );
    const userIdToRef = new Map<string, RefByUnique<typeof DeclaredAwsSsoUser>>(
      users.map((u) => [u.id, { instance: instanceRef, userName: u.userName }]),
    );

    // build permission set unique ref
    const permissionSetUniqueRef: RefByUnique<
      typeof DeclaredAwsSsoPermissionSet
    > = {
      instance: instanceRef,
      name:
        'name' in input.where.permissionSet
          ? input.where.permissionSet.name
          : UnexpectedCodePathError.throw(
              'permissionSet ref must include name for getAllSsoAccountAssignments',
              { permissionSetRef: input.where.permissionSet },
            ),
    };

    // list assignments with pagination
    const assignments: HasReadonly<typeof DeclaredAwsSsoAccountAssignment>[] =
      [];
    let nextToken: string | undefined;

    do {
      const response = await sso.send(
        new ListAccountAssignmentsCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetRef.arn,
          AccountId: targetAccountRef.id,
          NextToken: nextToken,
        }),
      );

      // cast each assignment to domain format
      for (const assignment of response.AccountAssignments ?? []) {
        const principalRef = assignment.PrincipalId
          ? userIdToRef.get(assignment.PrincipalId)
          : undefined;
        if (!principalRef) continue; // skip if user not found

        assignments.push(
          castIntoDeclaredAwsSsoAccountAssignment({
            response: assignment,
            instance: instanceRef,
            permissionSet: permissionSetUniqueRef,
            principal: principalRef,
            target: targetAccountRef,
          }),
        );
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return assignments;
  },
);
