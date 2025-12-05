import type { RefByUnique } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import type { DeclaredAwsIamRole } from '../../../domain.objects/DeclaredAwsIamRole';

/**
 * .what = extracts role name from an IAM role ARN and returns RefByUnique
 * .why = AWS SDK returns role as ARN, but we need RefByUnique with name
 * .how = parses the last segment after 'role/' from the ARN
 */
export const parseRoleArnIntoRef = (
  arn: string,
): RefByUnique<typeof DeclaredAwsIamRole> => {
  // ARN format: arn:aws:iam::123456789012:role/role-name
  const match = arn.match(/role\/(.+)$/);
  if (!match)
    throw new UnexpectedCodePathError('could not extract role name from ARN', {
      arn,
    });
  return { name: match[1]! };
};
