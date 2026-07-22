import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure that represents a plaintext AWS SSM Parameter (type=String)
 * .why = enables declarative management of non-secret config in Parameter Store
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — parameter names are unique within an aws account+region
 *
 * .note
 *   - the value is NOT sensitive, so drift is detected by a normal value-compare
 *     (plan reads the live value via GetParameter — no kms:Decrypt needed for a String)
 *   - for the secret variant (write-only, no read-back), see DeclaredAwsSsmParameterSecure
 *   - tier is omitted from v1 (add-when-needed): niche, it only matters for values >4 KB
 *     or param policies, so AWS's Standard default suffices (rule.prefer.wet-over-dry)
 *   - no delete op: the DAO exposes get + set only (delete: null), deferred until a real
 *     need appears (rule.prefer.wet-over-dry). the secret variant DOES support delete because
 *     a stale secret is a security concern; a stale plaintext config is not
 */
export interface DeclaredAwsSsmParameterPlain {
  /**
   * .what = the arn of the parameter
   * .note = @metadata — assigned by aws
   */
  arn?: string;

  /**
   * .what = the fully qualified name (path) of the parameter
   * .note = @unique
   * .example = '/svc-notifications/prod/log-level'
   */
  name: string;

  /**
   * .what = the parameter value
   * .note = roundtrip read-write — compared for drift detection
   */
  value: string;

  /**
   * .what = an optional human description of the parameter
   * .note = roundtrip read-write — read via DescribeParameters, written via PutParameter;
   *   null = no description
   */
  description: string | null;

  /**
   * .what = the tags applied to the parameter
   * .note = roundtrip read-write — read via ListTagsForResource, written via
   *   AddTagsToResource/RemoveTagsFromResource; null = no tags
   */
  tags: DeclaredAwsTags | null;

  /**
   * .what = the parameter version
   * .note = @readonly — assigned by aws, increments on each write
   */
  version?: number;

  /**
   * .what = when the parameter was last modified
   * .note = @readonly — assigned by aws
   */
  lastModifiedAt?: UniDateTime;
}

export class DeclaredAwsSsmParameterPlain
  extends DomainEntity<DeclaredAwsSsmParameterPlain>
  implements DeclaredAwsSsmParameterPlain
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = parameter name (path) is unique within the aws account+region
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = intrinsic attributes resolved from aws, not user-settable
   */
  public static readonly = ['version', 'lastModifiedAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    tags: DeclaredAwsTags,
  };
}
