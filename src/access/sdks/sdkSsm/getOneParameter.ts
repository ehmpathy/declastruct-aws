import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { UnexpectedCodePathError } from 'helpful-errors';
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
    const found = response.Parameter;

    // fail loud if aws omits a field that must always be present for a real parameter — never
    // fabricate a default (arn is the primary key; version + lastModifiedDate are @readonly;
    // value is the roundtrip field the plain drift-compare needs)
    const value =
      found.Value ??
      UnexpectedCodePathError.throw('GetParameter returned no Value', {
        name: input.name,
      });
    const arn =
      found.ARN ??
      UnexpectedCodePathError.throw(
        'GetParameter returned no ARN (primary key)',
        { name: input.name },
      );
    const version =
      found.Version ??
      UnexpectedCodePathError.throw('GetParameter returned no Version', {
        name: input.name,
      });
    const lastModifiedDate =
      found.LastModifiedDate ??
      UnexpectedCodePathError.throw(
        'GetParameter returned no LastModifiedDate',
        {
          name: input.name,
        },
      );

    // return parameter shape
    return {
      name: found.Name ?? input.name,
      value,
      // boundary cast: aws types Parameter.Type as the open `ParameterType` string enum; we
      // narrow it to our closed union at the sdk boundary — aws only ever returns one of these
      // three for a real parameter (rule.forbid.as-cast boundary exemption)
      type: found.Type as 'String' | 'StringList' | 'SecureString',
      version: Number(version),
      arn,
      lastModifiedAt: lastModifiedDate.toISOString(),
    };
  } catch (error) {
    // return null if parameter not found
    if (error instanceof ParameterNotFound) return null;
    throw error;
  }
};
