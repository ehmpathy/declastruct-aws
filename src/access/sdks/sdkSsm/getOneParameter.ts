import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = retrieves a single SSM parameter by name
 * .why = raw i/o communicator for SSM Parameter Store
 */
export const getOneParameter = async (
  input: {
    name: string;
    withDecryption?: boolean;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  name: string;
  value: string;
  type: 'String' | 'StringList' | 'SecureString';
  version: number;
  arn: string;
  lastModifiedAt: string;
} | null> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // get parameter
  try {
    const response = await ssm.send(
      new GetParameterCommand({
        Name: input.name,
        WithDecryption: input.withDecryption ?? true,
      }),
    );

    // return null if parameter not found
    if (!response.Parameter) return null;

    // return parameter shape
    return {
      name: response.Parameter.Name ?? input.name,
      value: response.Parameter.Value ?? '',
      type: response.Parameter.Type as 'String' | 'StringList' | 'SecureString',
      version: Number(response.Parameter.Version ?? 0),
      arn: response.Parameter.ARN ?? '',
      lastModifiedAt:
        response.Parameter.LastModifiedDate?.toISOString() ??
        new Date().toISOString(),
    };
  } catch (error) {
    // return null if parameter not found
    if (error instanceof ParameterNotFound) return null;
    throw error;
  }
};
