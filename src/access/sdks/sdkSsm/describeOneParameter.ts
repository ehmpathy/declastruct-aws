import { DescribeParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = describes a single SSM parameter's metadata by name (NO value)
 * .why = metadata-only lookup so a secret can be reconciled without GetParameter
 *   or kms:Decrypt — DescribeParameters returns Name/Type/KeyId/Description/
 *   Version/LastModifiedDate but never the Value
 */
export const describeOneParameter = async (
  input: {
    name: string;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<{
  name: string;
  arn: string;
  type: 'String' | 'StringList' | 'SecureString';
  keyId: string | null;
  description: string | null;
  version: number;
  lastModifiedAt: string;
} | null> => {
  // create ssm client
  const ssm = new SSMClient({ region: context.aws.credentials.region });

  // describe parameters filtered to this exact name (metadata only, no value)
  const response = await ssm.send(
    new DescribeParametersCommand({
      ParameterFilters: [
        { Key: 'Name', Option: 'Equals', Values: [input.name] },
      ],
    }),
  );

  // return null if no parameter matches
  const metadata = response.Parameters?.[0];
  if (!metadata) return null;

  // fail loud if aws omits an identity/readonly field that must always be present.
  // arn is the PRIMARY key; version + lastModifiedDate are @readonly. an absent value here
  // means an unexpected aws response, NOT a valid parameter — never fabricate a default.
  const arn =
    metadata.ARN ??
    UnexpectedCodePathError.throw(
      'DescribeParameters returned a parameter without an ARN (primary key)',
      { name: input.name, metadata },
    );
  const version =
    metadata.Version ??
    UnexpectedCodePathError.throw(
      'DescribeParameters returned a parameter without a Version',
      { name: input.name, metadata },
    );
  const lastModifiedDate =
    metadata.LastModifiedDate ??
    UnexpectedCodePathError.throw(
      'DescribeParameters returned a parameter without a LastModifiedDate',
      { name: input.name, metadata },
    );

  // return the metadata shape (never a value)
  return {
    name: metadata.Name ?? input.name,
    arn,
    // boundary cast: the aws sdk types ParameterMetadata.Type as the open `ParameterType`
    // string enum; we narrow it to our closed union at the sdk boundary. safe — aws only ever
    // returns one of these three for a real parameter (rule.forbid.as-cast boundary exemption)
    type: metadata.Type as 'String' | 'StringList' | 'SecureString',
    keyId: metadata.KeyId ?? null,
    // map an absent OR empty description to null — aws stores a cleared description as '' (we
    // clear it by a PutParameter with Description: ''), and a declared `null` must read back as
    // null for the roundtrip to converge, so `|| null` folds both '' and undefined to null
    description: metadata.Description || null,
    version: Number(version),
    lastModifiedAt: lastModifiedDate.toISOString(),
  };
};
