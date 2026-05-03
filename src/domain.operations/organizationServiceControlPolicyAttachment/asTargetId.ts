import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { ServiceControlPolicyAttachmentTarget } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
import { getOrganizationRootId } from '@src/domain.operations/organization/getOrganizationRootId';
import { getOneOrganizationAccount } from '@src/domain.operations/organizationAccount/getOneOrganizationAccount';

import { isOrgRef } from './isOrgRef';

/**
 * .what = derives target id from ref (org or account)
 * .why = supports multiple ref types for SCP attachment targets
 * .note
 *   - org: fetches root ID via getOrganizationRootId
 *   - account by id: returns id directly
 *   - account by email: looks up account to get id
 */
export const asTargetId = async (input: {
  target: ServiceControlPolicyAttachmentTarget;
  context: ContextAwsApi & VisualogicContext;
}): Promise<string | null> => {
  const { target, context } = input;

  // org ref: fetch root ID
  if (isOrgRef(target)) {
    return getOrganizationRootId({ by: { auth: true } }, context);
  }

  // account by id: return id directly
  if ('id' in target && typeof target.id === 'string') return target.id;

  // account by email: lookup to get id
  if ('email' in target && target.email) {
    const account = await getOneOrganizationAccount(
      { by: { unique: { email: target.email } } },
      context,
    );
    return account?.id ?? null;
  }

  return null;
};
