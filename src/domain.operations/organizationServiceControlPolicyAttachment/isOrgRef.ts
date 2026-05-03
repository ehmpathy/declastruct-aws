import type { Ref } from 'domain-objects';

import type { DeclaredAwsOrganization } from '@src/domain.objects/DeclaredAwsOrganization';
import type { ServiceControlPolicyAttachmentTarget } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';

/**
 * .what = type guard for org ref (vs account ref)
 * .why = enables org vs account target distinction for SCP attachment
 * .note
 *   - org ref: { id: 'o-xxx' } or { managementAccount: { id: '...' } }
 *   - account ref: { id: '123...' } or { email: '...' }
 */
export const isOrgRef = (
  target: ServiceControlPolicyAttachmentTarget,
): target is Ref<typeof DeclaredAwsOrganization> => {
  // org by unique: has managementAccount
  if ('managementAccount' in target) return true;

  // org by primary: id starts with 'o-'
  if ('id' in target && typeof target.id === 'string')
    return target.id.startsWith('o-');

  return false;
};
