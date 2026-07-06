import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
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
      Overwrite: input.overwrite ?? true,
    }),
  );

  // return version
  return {
    version: Number(response.Version ?? 1),
  };
};
