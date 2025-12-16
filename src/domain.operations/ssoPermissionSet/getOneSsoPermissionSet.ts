import {
  DescribePermissionSetCommand,
  GetInlinePolicyForPermissionSetCommand,
  ListManagedPoliciesInPermissionSetCommand,
  ListTagsForResourceCommand,
  SSOAdminClient,
} from '@aws-sdk/client-sso-admin';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsSsoPermissionSet } from '@src/domain.objects/DeclaredAwsSsoPermissionSet';
import { getOneSsoInstance } from '@src/domain.operations/ssoInstance/getOneSsoInstance';

import { castIntoDeclaredAwsSsoPermissionSet } from './castIntoDeclaredAwsSsoPermissionSet';
import { getAllSsoPermissionSets } from './getAllSsoPermissionSets';

/**
 * .what = retrieves an sso permission set from aws
 * .why = enables lookup by primary (arn) or unique (instance, name)
 */
export const getOneSsoPermissionSet = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsSsoPermissionSet>;
        unique: RefByUnique<typeof DeclaredAwsSsoPermissionSet>;
        ref: Ref<typeof DeclaredAwsSsoPermissionSet>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsSsoPermissionSet> | null> => {
    // resolve ref to primary or unique
    const by = (() => {
      if (!input.by.ref) return input.by;
      if (isRefByUnique({ of: DeclaredAwsSsoPermissionSet })(input.by.ref))
        return { unique: input.by.ref };
      if (isRefByPrimary({ of: DeclaredAwsSsoPermissionSet })(input.by.ref))
        return { primary: input.by.ref };
      return UnexpectedCodePathError.throw(
        'ref is neither unique nor primary',
        {
          input,
        },
      );
    })();

    // lookup by unique: use getAllSsoPermissionSets and filter by name
    if (by.unique) {
      const permissionSets = await getAllSsoPermissionSets(
        { where: { instance: by.unique.instance } },
        context,
      );
      return permissionSets.find((ps) => ps.name === by.unique!.name) ?? null;
    }

    // lookup by primary: fetch directly by arn
    if (by.primary) {
      // resolve instance from auth context
      const instance =
        (await getOneSsoInstance({ by: { auth: true } }, context)) ??
        UnexpectedCodePathError.throw(
          'sso instance not found for auth context',
        );

      // sanity check: verify the permission set arn belongs to this instance
      // arn format: arn:aws:sso:::permissionSet/{instanceId}/{permissionSetId}
      const instanceIdFromArn = by.primary.arn.split('/')[1];
      const instanceIdFromAuth = instance.arn.split('/')[1];
      if (instanceIdFromArn !== instanceIdFromAuth)
        UnexpectedCodePathError.throw(
          'permission set arn does not belong to auth context instance',
          { instanceIdFromArn, instanceIdFromAuth },
        );

      // create sso admin client
      const sso = new SSOAdminClient({
        region: context.aws.credentials.region,
      });

      // fetch permission set details
      try {
        const [
          describeResponse,
          managedPoliciesResponse,
          inlinePolicyResponse,
          tagsResponse,
        ] = await Promise.all([
          sso.send(
            new DescribePermissionSetCommand({
              InstanceArn: instance.arn,
              PermissionSetArn: by.primary.arn,
            }),
          ),
          sso.send(
            new ListManagedPoliciesInPermissionSetCommand({
              InstanceArn: instance.arn,
              PermissionSetArn: by.primary.arn,
            }),
          ),
          sso.send(
            new GetInlinePolicyForPermissionSetCommand({
              InstanceArn: instance.arn,
              PermissionSetArn: by.primary.arn,
            }),
          ),
          sso.send(
            new ListTagsForResourceCommand({
              InstanceArn: instance.arn,
              ResourceArn: by.primary.arn,
            }),
          ),
        ]);

        if (!describeResponse.PermissionSet) return null;

        // cast to domain format
        return castIntoDeclaredAwsSsoPermissionSet({
          response: describeResponse.PermissionSet,
          instance,
          managedPolicies: managedPoliciesResponse.AttachedManagedPolicies,
          inlinePolicy: inlinePolicyResponse.InlinePolicy,
          tags: tagsResponse.Tags,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'ResourceNotFoundException'
        )
          return null;
        throw error;
      }
    }

    return UnexpectedCodePathError.throw(
      'could not resolve permission set lookup',
      { by },
    );
  },
);
