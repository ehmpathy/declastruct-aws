import type { LogGroup as SdkAwsLogGroup } from '@aws-sdk/client-cloudwatch-logs';
import { isUniDateTime } from '@ehmpathy/uni-time';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { assure } from 'type-fns';

import { DeclaredAwsLogGroup } from '../../domain.objects/DeclaredAwsLogGroup';

/**
 * .what = transforms aws sdk LogGroup into DeclaredAwsLogGroup
 * .why = ensures type safety when mapping from AWS SDK types
 *
 * .note
 *   - readonly fields (storedBytes, createdAt, retentionInDays) may be undefined
 *   - AWS may not always return these values (e.g., storedBytes has ~24hr delay)
 */
export const castIntoDeclaredAwsLogGroup = (
  input: SdkAwsLogGroup,
): HasReadonly<typeof DeclaredAwsLogGroup> => {
  // cast and assure readonly fields are present
  return assure(
    DeclaredAwsLogGroup.as({
      arn: input.arn,
      name: input.logGroupName!,
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
    hasReadonly({ of: DeclaredAwsLogGroup }),
  );
};
