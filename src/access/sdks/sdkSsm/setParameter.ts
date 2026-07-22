import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = creates or updates an SSM parameter
 * .why = raw i/o communicator for SSM Parameter Store
 */
export const setParameter = async (
  input: {
    name: string;
    value: string;
    type?: 'String' | 'StringList' | 'SecureString';
    description?: string;
    keyId?: string;
    overwrite?: boolean;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  version: number;
}> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // put parameter
  const response = await ssm.send(
    new PutParameterCommand({
      Name: input.name,
      Value: input.value,
      Type: input.type ?? 'String',
      Description: input.description,
      KeyId: input.keyId,
      Overwrite: input.overwrite ?? true,
    }),
  );

  // return version — fail loud if aws omits it (PutParameter always returns a Version on
  // success); never fabricate a default version
  const version =
    response.Version ??
    UnexpectedCodePathError.throw('PutParameter returned no Version', {
      name: input.name,
    });
  return {
    version: Number(version),
  };
};
