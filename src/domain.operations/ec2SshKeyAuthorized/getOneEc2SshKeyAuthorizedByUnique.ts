import type { HasReadonly, RefByUnique } from 'domain-objects';
import type { ContextLogTrail } from 'sdk-logs';

import { sdkSsm } from '@src/access/sdks/sdkSsm';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsEc2SshKeyAuthorized } from '@src/domain.objects/DeclaredAwsEc2SshKeyAuthorized';

import { asEc2SshKeyAuthorized } from './asEc2SshKeyAuthorized';

/**
 * .what = gets an authorized SSH key by unique key (instance + comment)
 * .why = enables lookup of authorized keys for an instance
 */
export const getOneEc2SshKeyAuthorizedByUnique = async (
  input: {
    by: { unique: RefByUnique<typeof DeclaredAwsEc2SshKeyAuthorized> };
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2SshKeyAuthorized> | null> => {
  // compute ssm parameter name from unique key
  const paramName = `/declastruct/ec2/ssh-keys/${input.by.unique.instance.exid}/${input.by.unique.comment}`;

  // get ssm parameter
  const param = await sdkSsm.getOneParameter({ name: paramName }, context);

  // return null if not found
  if (!param) return null;

  // cast to domain object
  return asEc2SshKeyAuthorized({
    instanceExid: input.by.unique.instance.exid,
    paramValue: param.value,
  });
};
