import {
  DescribePermissionSetCommand,
  GetInlinePolicyForPermissionSetCommand,
  ListManagedPoliciesInPermissionSetCommand,
  ListPermissionSetsCommand,
  ListTagsForResourceCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import type { HasReadonly, Ref } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsSsoInstance } from '@src/domain.objects/DeclaredAwsSsoInstance';
import type { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import { castIntoDeclaredAwsSsoPermissionSet } from './castIntoDeclaredAwsSsoPermissionSet';

/**
 * .what = lists all sso permission sets in the identity center instance
 * .why = enables discovery and enumeration of configured permission sets
 */
export const getAllSsoPermissionSets = asProcedure(
  async (
    input: {
      where: {
        instance: Ref<typeof DeclaredAwsSsoInstance>;
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoPermissionSet>[]> => {
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

    // list all permission sets
    const listResponse = await sso.send(
      new ListPermissionSetsCommand({
        InstanceArn: instance.arn,
      }),
    );

    // get details for each permission set
    const permissionSets: HasReadonly<typeof DeclaredAwsSsoPermissionSet>[] =
      [];

    for (const arn of listResponse.PermissionSets ?? []) {
      // fetch all permission set details in parallel
      const [
        describeResponse,
        managedPoliciesResponse,
        inlinePolicyResponse,
        tagsResponse,
      ] = await Promise.all([
        sso.send(
          new DescribePermissionSetCommand({
            InstanceArn: instance.arn,
            PermissionSetArn: arn,
          }),
        ),
        sso.send(
          new ListManagedPoliciesInPermissionSetCommand({
            InstanceArn: instance.arn,
            PermissionSetArn: arn,
          }),
        ),
        sso.send(
          new GetInlinePolicyForPermissionSetCommand({
            InstanceArn: instance.arn,
            PermissionSetArn: arn,
          }),
        ),
        sso.send(
          new ListTagsForResourceCommand({
            InstanceArn: instance.arn,
            ResourceArn: arn,
          }),
        ),
      ]);

      if (!describeResponse.PermissionSet) continue;

      // cast to domain format
      permissionSets.push(
        castIntoDeclaredAwsSsoPermissionSet({
          response: describeResponse.PermissionSet,
          instance,
          managedPolicies: managedPoliciesResponse.AttachedManagedPolicies,
          inlinePolicy: inlinePolicyResponse.InlinePolicy,
          tags: tagsResponse.Tags,
        }),
      );
    }

    return permissionSets;
  },
);
