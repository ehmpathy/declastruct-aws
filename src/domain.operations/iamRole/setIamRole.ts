import {
  CreateRoleCommand,
  IAMClient,
  TagRoleCommand,
  UntagRoleCommand,
  UpdateAssumeRolePolicyCommand,
  UpdateRoleCommand,
  waitUntilRoleExists,
} from '@aws-sdk/client-iam';
import { asProcedure } from 'as-procedure';
import { HasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { PickOne } from 'type-fns';
import { VisualogicContext } from 'visualogic';

import { ContextAwsApi } from '../../domain.objects/ContextAwsApi';
import { DeclaredAwsIamRole } from '../../domain.objects/DeclaredAwsIamRole';
import { castFromDeclaredAwsIamPolicyDocument } from './castFromDeclaredAwsIamPolicyDocument';
import { getIamRole } from './getIamRole';

/**
 * .what = creates or updates an iam role
 * .why = enables declarative role management with trust policy
 *
 * .note
 *   - polls until role is assumable after creation (iam eventual consistency)
 *   - uses waitUntilRoleExists waiter for readiness check
 */
export const setIamRole = asProcedure(
  async (
    input: PickOne<{
      finsert: DeclaredAwsIamRole;
      upsert: DeclaredAwsIamRole;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsIamRole>> => {
    const roleDesired = input.finsert ?? input.upsert;

    // create iam client
    const iam = new IAMClient({ region: context.aws.credentials.region });

    // check whether it already exists
    const before = await getIamRole(
      { by: { unique: { name: roleDesired.name } } },
      context,
    );

    // if it's a finsert and had a before, then return that
    if (before && input.finsert) return before;

    // build trust policy document from policy statements
    const trustPolicyDocument = castFromDeclaredAwsIamPolicyDocument({
      statements: roleDesired.policies,
    });

    // if exists + upsert, update the role
    if (before && input.upsert) {
      // update role description if provided
      if (roleDesired.description !== before.description) {
        await iam.send(
          new UpdateRoleCommand({
            RoleName: roleDesired.name,
            Description: roleDesired.description,
          }),
        );
      }

      // update trust policy
      await iam.send(
        new UpdateAssumeRolePolicyCommand({
          RoleName: roleDesired.name,
          PolicyDocument: trustPolicyDocument,
        }),
      );

      // update tags if changed
      const desiredTags = roleDesired.tags ?? {};
      const tagsBefore = before.tags ?? {};

      // remove tags that are no longer desired
      const tagsToRemove = Object.keys(tagsBefore).filter(
        (key) => !(key in desiredTags),
      );
      if (tagsToRemove.length > 0) {
        await iam.send(
          new UntagRoleCommand({
            RoleName: roleDesired.name,
            TagKeys: tagsToRemove,
          }),
        );
      }

      // add/update tags
      const tagsToSet = Object.entries(desiredTags).filter(
        ([key, value]) => tagsBefore[key] !== value,
      );
      if (tagsToSet.length > 0) {
        await iam.send(
          new TagRoleCommand({
            RoleName: roleDesired.name,
            Tags: tagsToSet.map(([key, value]) => ({ Key: key, Value: value })),
          }),
        );
      }

      // fetch and return updated role
      const updated = await getIamRole(
        { by: { unique: { name: roleDesired.name } } },
        context,
      );
      if (!updated)
        UnexpectedCodePathError.throw('role disappeared after update', {
          roleDesired,
        });
      return updated;
    }

    // otherwise, create it
    await iam.send(
      new CreateRoleCommand({
        RoleName: roleDesired.name,
        Path: roleDesired.path ?? '/',
        Description: roleDesired.description,
        AssumeRolePolicyDocument: trustPolicyDocument,
        Tags: roleDesired.tags
          ? Object.entries(roleDesired.tags).map(([key, value]) => ({
              Key: key,
              Value: value,
            }))
          : undefined,
      }),
    );

    // wait until role is ready (eventual consistency)
    await waitUntilRoleExists(
      { client: iam, maxWaitTime: 60 },
      { RoleName: roleDesired.name },
    );

    // fetch and return created role
    const created = await getIamRole(
      { by: { unique: { name: roleDesired.name } } },
      context,
    );
    if (!created)
      UnexpectedCodePathError.throw('role not found after creation', {
        roleDesired,
      });
    return created;
  },
);
