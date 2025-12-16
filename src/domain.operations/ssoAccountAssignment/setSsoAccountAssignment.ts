import {
  CreateAccountAssignmentCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoAccountAssignment } from '@src/domain.objects/DeclaredAwsSsoAccountAssignment';
import { getRefByPrimaryOfOrganizationAccount } from '@src/domain.operations/organizationAccount/getRefByPrimaryOfOrganizationAccount';
import { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';
import { getRefByPrimaryOfSsoPermissionSet } from '@src/domain.operations/ssoPermissionSet/getRefByPrimaryOfSsoPermissionSet';
import { getRefByPrimaryOfSsoUser } from '@src/domain.operations/ssoUser/getRefByPrimaryOfSsoUser';

import { getOneSsoAccountAssignment } from './getOneSsoAccountAssignment';

/**
 * .what = creates an sso account assignment
 * .why = enables declarative account assignment management for identity center
 *
 * .note
 *   - assignments are identified by composite key (all fields together)
 *   - assignments cannot be updated, only created or deleted
 *   - findsert is the only supported mode (no upsert since no updatable fields)
 */
export const setSsoAccountAssignment = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsoAccountAssignment;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoAccountAssignment>> => {
    const assignmentDesired = input.findsert;

    // resolve instance
    const instance =
      (await getOneSsoInstance(
        { by: { ref: assignmentDesired.instance } },
        context,
      )) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        instanceRef: assignmentDesired.instance,
      });

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // check whether it already exists
    const before = await getOneSsoAccountAssignment(
      { by: { unique: assignmentDesired } },
      context,
    );

    // if it already exists, return it (findsert behavior)
    if (before) return before;

    // resolve permission set to primary ref (with arn)
    const permissionSetRef =
      (await getRefByPrimaryOfSsoPermissionSet(
        { ref: assignmentDesired.permissionSet },
        context,
      )) ??
      UnexpectedCodePathError.throw('permission set not found', {
        permissionSetRef: assignmentDesired.permissionSet,
      });

    // resolve principal to primary ref (with id)
    const principalRef =
      (await getRefByPrimaryOfSsoUser(
        { ref: assignmentDesired.principal },
        context,
      )) ??
      UnexpectedCodePathError.throw('principal user not found', {
        principalRef: assignmentDesired.principal,
      });

    // resolve target account to primary ref (with id)
    const targetAccountRef = await getRefByPrimaryOfOrganizationAccount(
      { ref: assignmentDesired.target },
      context,
    );

    // create the assignment
    const createResponse = await sso.send(
      new CreateAccountAssignmentCommand({
        InstanceArn: instance.arn,
        PermissionSetArn: permissionSetRef.arn,
        PrincipalType: assignmentDesired.principalType,
        PrincipalId: principalRef.id,
        TargetType: assignmentDesired.targetType,
        TargetId: targetAccountRef.id,
      }),
    );

    // check for creation status
    if (createResponse.AccountAssignmentCreationStatus?.FailureReason)
      UnexpectedCodePathError.throw('account assignment creation failed', {
        createResponse,
      });

    // fetch and return created assignment
    return (
      (await getOneSsoAccountAssignment(
        { by: { unique: assignmentDesired } },
        context,
      )) ??
      UnexpectedCodePathError.throw(
        'account assignment not found after creation',
        { assignmentDesired },
      )
    );
  },
);
