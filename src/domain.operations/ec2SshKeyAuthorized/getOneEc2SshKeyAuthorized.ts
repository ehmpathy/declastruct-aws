import type { HasReadonly, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';

import { getOneEc2SshKeyAuthorizedByUnique } from './getOneEc2SshKeyAuthorizedByUnique';

/**
 * .what = gets an authorized SSH key by unique key
 * .why = provides lookup interface for SSH key authorization
 * .note = only unique key supported (no primary key on this domain object)
 */
export const getOneEc2SshKeyAuthorized = async (
  input: {
    by: {
      unique: RefByUnique<typeof DeclaredAwsEc2SshKeyAuthorized>;
    };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2SshKeyAuthorized> | null> => {
  return getOneEc2SshKeyAuthorizedByUnique(
    { by: { unique: input.by.unique } },
    context,
  );
};
