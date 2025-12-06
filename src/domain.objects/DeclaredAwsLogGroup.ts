import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity } from 'domain-objects';

/**
 * .what = a declarative structure representing an AWS CloudWatch Log Group
 * .why = enables declarative log group discovery and management
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — log group names are unique within an aws account
 *
 * .note
 *   - for lambda functions, automatically created as /aws/lambda/<function-name>
 *   - arn is @metadata — assigned by AWS, may be undefined until resolved
 */
export interface DeclaredAwsLogGroup {
  /**
   * .what = the arn of the log group
   * .note = @metadata — assigned by AWS
   */
  arn?: string;

  /**
   * .what = the name of the log group
   * .note = @unique
   * .example = '/aws/lambda/svc-chat-prod-getDisplayableMessages'
   */
  name: string;

  /**
   * .what = the log group class
   */
  class: 'STANDARD' | 'INFREQUENT_ACCESS' | 'DELIVERY';

  /**
   * .what = optional KMS key for encryption
   */
  kmsKeyId: string | null;

  /**
   * .what = retention period in days
   * .note = null means never expire
   */
  retentionInDays?: number | null;

  /**
   * .what = when the log group was created
   * .note = @readonly
   */
  createdAt?: UniDateTime;

  /**
   * .what = total bytes stored in the log group
   * .note = @readonly — updates with ~24hr delay
   */
  storedBytes?: number;
}

export class DeclaredAwsLogGroup
  extends DomainEntity<DeclaredAwsLogGroup>
  implements DeclaredAwsLogGroup
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = log group name is unique within the aws account
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = intrinsic attributes resolved from AWS, not user-settable
   * .note = these are real attributes of the resource, but derived from the source of truth
   */
  public static readonly = ['storedBytes', 'createdAt'] as const;
}
