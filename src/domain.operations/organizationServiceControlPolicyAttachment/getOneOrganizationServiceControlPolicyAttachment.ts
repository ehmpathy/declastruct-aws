import {
  ListPoliciesForTargetCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  hasReadonly,
  RefByPrimary,
  type RefByUnique,
  RefByUnique as RefByUniqueClass,
} from 'domain-objects';
import { HelpfulError } from 'helpful-errors';
import { assure } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import {
  DeclaredAwsOrganizationServiceControlPolicyAttachment,
  type ServiceControlPolicyAttachmentTarget,
} from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
import { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';

import { asTargetId } from './asTargetId';
import { isOrgRef } from './isOrgRef';

/**
 * .what = wraps target in appropriate Ref type for domain object instantiation
 * .why = domain-objects requires explicit Ref types for nested union fields
 */
const asTargetRef = (
  target: ServiceControlPolicyAttachmentTarget,
): ServiceControlPolicyAttachmentTarget => {
  if (isOrgRef(target)) {
    // org ref: by primary (id) or by unique (managementAccount)
    if ('id' in target) {
      return RefByPrimary.as<typeof DeclaredAwsOrganization>({
        id: target.id as string,
      });
    }
    return RefByUniqueClass.as<typeof DeclaredAwsOrganization>({
      managementAccount: (target as { managementAccount: { id: string } })
        .managementAccount,
    });
  }
  // account ref: by primary (id) or by unique (email)
  if ('id' in target) {
    return RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
      id: target.id as string,
    });
  }
  return RefByUniqueClass.as<typeof DeclaredAwsOrganizationAccount>({
    email: (target as { email: string }).email,
  });
};

/**
 * .what = retrieves an SCP attachment by policy + target
 * .why = enables lookup of a specific attachment
 * .note
 *   - looks up policy by name, then target by id/email/rootId
 *   - checks if target has the policy attached
 *   - returns null if not attached
 */
export const getOneOrganizationServiceControlPolicyAttachment = asProcedure(
  async (
    input: {
      by: {
        unique: {
          policy: RefByUnique<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >;
          target: ServiceControlPolicyAttachmentTarget;
        };
      };
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<
    typeof DeclaredAwsOrganizationServiceControlPolicyAttachment
  > | null> => {
    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // lookup the policy to get its id
      const policy = await getOneOrganizationServiceControlPolicy(
        { by: { unique: input.by.unique.policy } },
        context,
      );
      if (!policy) return null;

      // derive target id (org root or account)
      const targetRef = input.by.unique.target;
      const targetId = await asTargetId({ target: targetRef, context });
      if (!targetId) return null;

      // list policies for the target to check if attached
      const response = await client.send(
        new ListPoliciesForTargetCommand({
          TargetId: targetId,
          Filter: 'SERVICE_CONTROL_POLICY',
        }),
      );

      // check if the policy is attached
      const isAttached = response.Policies?.some((p) => p.Id === policy.id);
      if (!isAttached) return null;

      // return the attachment with properly wrapped refs
      return assure(
        new DeclaredAwsOrganizationServiceControlPolicyAttachment({
          policy: RefByUniqueClass.as<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >({ name: policy.name }),
          target: asTargetRef(targetRef),
        }),
        hasReadonly({
          of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // target not found
      if (error.name === 'TargetNotFoundException') return null;

      throw new HelpfulError(
        'aws.getOneOrganizationServiceControlPolicyAttachment error',
        {
          cause: error,
          context: {
            errorName: error.name,
            errorMessage: error.message,
            input,
          },
        },
      );
    }
  },
);
