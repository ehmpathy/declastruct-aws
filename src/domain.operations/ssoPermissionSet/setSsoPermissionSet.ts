import {
  AttachManagedPolicyToPermissionSetCommand,
  CreatePermissionSetCommand,
  ProvisionPermissionSetCommand,
  PutInlinePolicyToPermissionSetCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoPermissionSet } from '../../domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoInstance } from '../ssoInstance/getOneSsoInstance';
import { getOneSsoPermissionSet } from './getOneSsoPermissionSet';
import { setSsoPermissionSetBasicProperties } from './setSsoPermissionSetBasicProperties';
import { setSsoPermissionSetInlinePolicy } from './setSsoPermissionSetInlinePolicy';
import { setSsoPermissionSetManagedPolicies } from './setSsoPermissionSetManagedPolicies';
import { setSsoPermissionSetTags } from './setSsoPermissionSetTags';

/**
 * .what = creates or updates an sso permission set
 * .why = enables declarative permission set management for identity center
 *
 * .note
 *   - permission sets are identified by instance + name (unique per instance)
 *   - policies and tags can be updated after creation
 */
export const setSsoPermissionSet = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsSsoPermissionSet;
      upsert: DeclaredAwsSsoPermissionSet;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoPermissionSet>> => {
    const permissionSetDesired = input.findsert ?? input.upsert;

    // resolve instance
    const instance =
      (await getOneSsoInstance(
        { by: { ref: permissionSetDesired.instance } },
        context,
      )) ??
      UnexpectedCodePathError.throw('sso instance not found', {
        instanceRef: permissionSetDesired.instance,
      });

    // create sso admin client
    const sso = new SSOAdminClient({ region: context.aws.credentials.region });

    // check whether it already exists
    const before = await getOneSsoPermissionSet(
      {
        by: {
          unique: {
            instance: permissionSetDesired.instance,
            name: permissionSetDesired.name,
          },
        },
      },
      context,
    );

    // if it's a findsert and had a before, then return that
    if (before && input.findsert) return before;

    // if exists + upsert, update the permission set
    if (before && input.upsert) {
      const permissionSetArn = before.arn;

      // update basic properties if changed
      await setSsoPermissionSetBasicProperties(
        {
          for: { instanceArn: instance.arn, permissionSetArn },
          update: {
            from: {
              description: before.description,
              sessionDuration: before.sessionDuration,
            },
            into: {
              description: permissionSetDesired.description,
              sessionDuration: permissionSetDesired.sessionDuration,
            },
          },
        },
        { sso },
      );

      // update managed policies
      await setSsoPermissionSetManagedPolicies(
        {
          for: { instanceArn: instance.arn, permissionSetArn },
          update: {
            from: before.policy.managed,
            into: permissionSetDesired.policy.managed,
          },
        },
        { sso },
      );

      // update inline policy
      await setSsoPermissionSetInlinePolicy(
        {
          for: { instanceArn: instance.arn, permissionSetArn },
          update: {
            from: before.policy.inline,
            into: permissionSetDesired.policy.inline,
          },
        },
        { sso },
      );

      // update tags
      await setSsoPermissionSetTags(
        {
          for: { instanceArn: instance.arn, permissionSetArn },
          update: {
            from: before.tags ?? {},
            into: permissionSetDesired.tags ?? {},
          },
        },
        { sso },
      );

      // provision permission set to propagate changes to all assigned accounts
      // ref: https://docs.aws.amazon.com/singlesignon/latest/APIReference/API_ProvisionPermissionSet.html
      await sso.send(
        new ProvisionPermissionSetCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetArn,
          TargetType: 'ALL_PROVISIONED_ACCOUNTS',
        }),
      );

      // fetch and return updated permission set
      return (
        (await getOneSsoPermissionSet(
          {
            by: {
              unique: {
                instance: permissionSetDesired.instance,
                name: permissionSetDesired.name,
              },
            },
          },
          context,
        )) ??
        UnexpectedCodePathError.throw(
          'permission set disappeared after update',
          { permissionSetDesired },
        )
      );
    }

    // otherwise, create it
    const createResponse = await sso.send(
      new CreatePermissionSetCommand({
        InstanceArn: instance.arn,
        Name: permissionSetDesired.name,
        Description: permissionSetDesired.description ?? undefined,
        SessionDuration: permissionSetDesired.sessionDuration ?? 'PT1H',
        Tags: permissionSetDesired.tags
          ? Object.entries(permissionSetDesired.tags).map(([key, value]) => ({
              Key: key,
              Value: value,
            }))
          : undefined,
      }),
    );

    // failfast if arn not returned
    const permissionSetArn =
      createResponse.PermissionSet?.PermissionSetArn ??
      UnexpectedCodePathError.throw('no arn returned from create', {
        createResponse,
      });

    // attach managed policies
    for (const policyArn of permissionSetDesired.policy.managed) {
      await sso.send(
        new AttachManagedPolicyToPermissionSetCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetArn,
          ManagedPolicyArn: policyArn,
        }),
      );
    }

    // set inline policy if not empty
    if (permissionSetDesired.policy.inline.statements.length > 0) {
      // convert domain format to aws format
      const awsPolicy = {
        Version: '2012-10-17',
        Statement: permissionSetDesired.policy.inline.statements.map(
          (stmt) => ({
            Sid: stmt.sid,
            Effect: stmt.effect,
            Principal: stmt.principal,
            Action: stmt.action,
            Resource: stmt.resource,
            Condition: stmt.condition,
          }),
        ),
      };
      await sso.send(
        new PutInlinePolicyToPermissionSetCommand({
          InstanceArn: instance.arn,
          PermissionSetArn: permissionSetArn,
          InlinePolicy: JSON.stringify(awsPolicy),
        }),
      );
    }

    // fetch and return created permission set
    return (
      (await getOneSsoPermissionSet(
        {
          by: {
            unique: {
              instance: permissionSetDesired.instance,
              name: permissionSetDesired.name,
            },
          },
        },
        context,
      )) ??
      UnexpectedCodePathError.throw('permission set not found after creation', {
        permissionSetDesired,
      })
    );
  },
);
