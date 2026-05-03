import {
  ListPoliciesForTargetCommand,
  ListTargetsForPolicyCommand,
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
import { BadRequestError, HelpfulError } from 'helpful-errors';
import { assure, type PickOne } from 'type-fns';
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
import { getOneOrganization } from '../organization/getOneOrganization';

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
 * .what = retrieves all SCP attachments for a policy or target
 * .why = enables list attachments for sync and audit
 * .note
 *   - forPolicy: lists all targets for a policy
 *   - forTarget: lists all policies for a target
 */
export const getAllOrganizationServiceControlPolicyAttachments = asProcedure(
  async (
    input: PickOne<{
      forPolicy: RefByUnique<
        typeof DeclaredAwsOrganizationServiceControlPolicy
      >;
      forTarget: ServiceControlPolicyAttachmentTarget;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicyAttachment>[]
  > => {
    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    try {
      // forPolicy: list all targets attached to a policy
      if (input.forPolicy) {
        return await getAllAttachmentsForPolicy({
          client,
          policyRef: input.forPolicy,
          context,
        });
      }

      // forTarget: list all policies attached to a target
      if (input.forTarget) {
        return await getAllAttachmentsForTarget({
          client,
          target: input.forTarget,
          context,
        });
      }

      BadRequestError.throw('must provide forPolicy or forTarget', { input });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      throw new HelpfulError(
        'aws.getAllOrganizationServiceControlPolicyAttachments error',
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

/**
 * .what = list all targets attached to a policy
 */
const getAllAttachmentsForPolicy = async (input: {
  client: OrganizationsClient;
  policyRef: RefByUnique<typeof DeclaredAwsOrganizationServiceControlPolicy>;
  context: ContextAwsApi & VisualogicContext;
}): Promise<
  HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicyAttachment>[]
> => {
  const { client, policyRef, context } = input;

  // lookup the policy
  const policy = await getOneOrganizationServiceControlPolicy(
    { by: { unique: policyRef } },
    context,
  );
  if (!policy) return [];

  const attachments: HasReadonly<
    typeof DeclaredAwsOrganizationServiceControlPolicyAttachment
  >[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new ListTargetsForPolicyCommand({
        PolicyId: policy.id,
        NextToken: nextToken,
      }),
    );

    for (const target of response.Targets ?? []) {
      if (!target.TargetId) continue;

      // handle org root targets — fetch org to get its id
      if (target.Type === 'ROOT') {
        const org = await getOneOrganization({ by: { auth: true } }, context);
        if (org) {
          attachments.push(
            assure(
              new DeclaredAwsOrganizationServiceControlPolicyAttachment({
                policy: RefByUniqueClass.as<
                  typeof DeclaredAwsOrganizationServiceControlPolicy
                >({ name: policy.name }),
                target: RefByPrimary.as<typeof DeclaredAwsOrganization>({
                  id: org.id,
                }),
              }),
              hasReadonly({
                of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
              }),
            ),
          );
        }
        continue;
      }

      // handle account targets
      if (target.Type === 'ACCOUNT') {
        attachments.push(
          assure(
            new DeclaredAwsOrganizationServiceControlPolicyAttachment({
              policy: RefByUniqueClass.as<
                typeof DeclaredAwsOrganizationServiceControlPolicy
              >({ name: policy.name }),
              target: RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
                id: target.TargetId,
              }),
            }),
            hasReadonly({
              of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
            }),
          ),
        );
      }

      // skip OU targets (not yet supported)
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return attachments;
};

/**
 * .what = list all policies attached to a target (org root or account)
 */
const getAllAttachmentsForTarget = async (input: {
  client: OrganizationsClient;
  target: ServiceControlPolicyAttachmentTarget;
  context: ContextAwsApi & VisualogicContext;
}): Promise<
  HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicyAttachment>[]
> => {
  const { client, target, context } = input;

  // derive target id (org root or account)
  const targetId = await asTargetId({ target, context });
  if (!targetId) return [];

  const attachments: HasReadonly<
    typeof DeclaredAwsOrganizationServiceControlPolicyAttachment
  >[] = [];
  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new ListPoliciesForTargetCommand({
        TargetId: targetId,
        Filter: 'SERVICE_CONTROL_POLICY',
        NextToken: nextToken,
      }),
    );

    for (const policySummary of response.Policies ?? []) {
      if (!policySummary.Name) continue;

      attachments.push(
        assure(
          new DeclaredAwsOrganizationServiceControlPolicyAttachment({
            policy: RefByUniqueClass.as<
              typeof DeclaredAwsOrganizationServiceControlPolicy
            >({ name: policySummary.Name }),
            target: asTargetRef(target),
          }),
          hasReadonly({
            of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
          }),
        ),
      );
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return attachments;
};
