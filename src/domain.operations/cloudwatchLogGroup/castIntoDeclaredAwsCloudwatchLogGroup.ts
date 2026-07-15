import type { LogGroup as SdkAwsLogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import { DeclaredAwsCloudwatchLogGroup } from '@src/domain.objects/DeclaredAwsCloudwatchLogGroup';

/**
 * .what = transforms aws sdk LogGroup into DeclaredAwsCloudwatchLogGroup
 * .why = ensures type safety as we translate from AWS SDK types
 *
 * .note
 *   - readonly fields (storedBytes, createdAt, retentionInDays) may be undefined
 *   - AWS may not always return these values (e.g., storedBytes has ~24hr delay)
 */
export const castIntoDeclaredAwsCloudwatchLogGroup = (
  input: SdkAwsLogGroup,
): HasReadonly<typeof DeclaredAwsCloudwatchLogGroup> => {
  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsCloudwatchLogGroup.as({
      arn: input.arn,
      // failfast: a described log group always carries a name; its absence is an
      // unexpected AWS response, not a nullable field — surface it loud
      name:
        input.logGroupName ??
        UnexpectedCodePathError.throw(
          'aws log group response lacks a logGroupName',
          { input },
        ),
      // boundary cast: the sdk types logGroupClass as a broad `string`; narrow it to
      // our union at this external-sdk boundary (per rule.forbid.as-cast exception)
      class:
        (input.logGroupClass as
          | 'STANDARD'
          | 'INFREQUENT_ACCESS'
          | 'DELIVERY') ?? 'STANDARD',
      kmsKeyId: input.kmsKeyId ?? null,
      retentionInDays: input.retentionInDays ?? null,
      createdAt: input.creationTime
        ? isUniDateTime.assure(new Date(input.creationTime).toISOString())
        : undefined,
      storedBytes: input.storedBytes,
    }),
    // note: hasReadonly ensures all `public static readonly` fields are defined on the object
    // this validates that AWS returned all expected readonly attributes after read
    hasReadonly({ of: DeclaredAwsCloudwatchLogGroup }),
  );
};
