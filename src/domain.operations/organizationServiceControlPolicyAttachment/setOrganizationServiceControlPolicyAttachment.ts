import {
  AttachPolicyCommand,
  OrganizationsClient,
} from '@aws-sdk/client-organizations';
import { asProcedure } from 'as-procedure';
import {
  type HasReadonly,
  hasReadonly,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';
import { BadRequestError, HelpfulError } from 'helpful-errors';
import { assure } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from '@src/domain.objects/DeclaredAwsOrganizationAccount';
import {
  DeclaredAwsOrganizationServiceControlPolicyAttachment,
  type ServiceControlPolicyAttachmentTarget,
} from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
import type { DeclaredAwsOrganizationServiceControlPolicy } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicy';
import { getOneOrganizationServiceControlPolicy } from '@src/domain.operations/organizationServiceControlPolicy/getOneOrganizationServiceControlPolicy';

import { asTargetId } from './asTargetId';
import { getOneOrganizationServiceControlPolicyAttachment } from './getOneOrganizationServiceControlPolicyAttachment';
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
    return RefByUnique.as<typeof DeclaredAwsOrganization>({
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
  return RefByUnique.as<typeof DeclaredAwsOrganizationAccount>({
    email: (target as { email: string }).email,
  });
};

/**
 * .what = attaches an SCP to a target account
 * .why = enables declarative attachment management
 * .note
 *   - findsert: returns extant if already attached
 *   - idempotent: DuplicatePolicyAttachmentException treated as success
 */
export const setOrganizationServiceControlPolicyAttachment = asProcedure(
  async (
    input: {
      findsert: DeclaredAwsOrganizationServiceControlPolicyAttachment;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<
    HasReadonly<typeof DeclaredAwsOrganizationServiceControlPolicyAttachment>
  > => {
    const desired = input.findsert;

    // declare the client
    const client = new OrganizationsClient({
      region: context.aws.credentials.region,
    });

    // lookup the policy to get its id
    const policy = await getOneOrganizationServiceControlPolicy(
      { by: { unique: desired.policy } },
      context,
    );
    if (!policy)
      BadRequestError.throw('policy not found', { policy: desired.policy });

    // derive the target id (org root or account)
    const targetId = await asTargetId({
      target: desired.target,
      context,
    });
    if (!targetId)
      BadRequestError.throw('target not found', {
        target: desired.target,
      });

    // preserve input target shape for return value
    const targetShape = desired.target;

    // check if already attached
    const attachmentFound =
      await getOneOrganizationServiceControlPolicyAttachment(
        {
          by: {
            unique: {
              policy: desired.policy,
              target: targetShape,
            },
          },
        },
        context,
      );
    if (attachmentFound) return attachmentFound;

    try {
      // attach the policy
      await client.send(
        new AttachPolicyCommand({
          PolicyId: policy.id,
          TargetId: targetId,
        }),
      );

      // return the attachment with properly wrapped refs
      return assure(
        new DeclaredAwsOrganizationServiceControlPolicyAttachment({
          policy: RefByUnique.as<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >({ name: policy.name }),
          target: asTargetRef(targetShape),
        }),
        hasReadonly({
          of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
        }),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // idempotent: already attached
      if (error.name === 'DuplicatePolicyAttachmentException') {
        return assure(
          new DeclaredAwsOrganizationServiceControlPolicyAttachment({
            policy: RefByUnique.as<
              typeof DeclaredAwsOrganizationServiceControlPolicy
            >({ name: policy.name }),
            target: asTargetRef(targetShape),
          }),
          hasReadonly({
            of: DeclaredAwsOrganizationServiceControlPolicyAttachment,
          }),
        );
      }

      throw new HelpfulError(
        'aws.setOrganizationServiceControlPolicyAttachment error',
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
