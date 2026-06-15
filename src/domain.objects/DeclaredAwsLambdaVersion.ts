import { DomainEntity, RefByUnique } from 'domain-objects';

import type { DeclaredAwsLambda } from './DeclaredAwsLambda';
import { DeclaredAwsLambdaVersionHash } from './DeclaredAwsLambdaVersionHash';

/**
 * .what = an immutable version of a lambda function
 * .why = represents a published snapshot that can be referenced by aliases
 *
 * .identity
 *   - @primary = [arn] — qualified arn with version number (e.g., :5)
 *   - @unique = [lambda, hash] — version uniquely identified by function + hashes
 *
 * .note
 *   - versions are immutable — once published, they cannot be modified
 *   - the version number is assigned sequentially by aws and never reused
 *   - PublishVersion is idempotent — if code+config unchanged, returns same version
 *   - hash.config is computed by declastruct since aws does not expose it
 */
export interface DeclaredAwsLambdaVersion {
  /**
   * .what = the qualified arn of the version
   * .note = @metadata — assigned by aws; includes version number suffix
   * .example = 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5'
   */
  arn?: string;

  /**
   * .what = the numeric version identifier
   * .note = @readonly — assigned sequentially by aws (e.g., '1', '2', '3')
   */
  version?: string;

  /**
   * .what = reference to the parent lambda function
   */
  lambda: RefByUnique<typeof DeclaredAwsLambda>;

  /**
   * .what = content hashes that uniquely identify this version
   * .note = code hash from aws, config hash computed by declastruct
   */
  hash: DeclaredAwsLambdaVersionHash;

  /**
   * .what = optional description for this version
   * .note = 0-256 chars; the only writable field on PublishVersion
   */
  description?: string | null;
}

export class DeclaredAwsLambdaVersion
  extends DomainEntity<DeclaredAwsLambdaVersion>
  implements DeclaredAwsLambdaVersion
{
  /**
   * .what = qualified arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = version is uniquely identified by function + content hashes
   * .note = this enables idempotent version lookup — find version by content hash
   */
  public static unique = ['lambda', 'hash'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = version number is assigned by aws, not user-settable
   */
  public static readonly = ['version'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    lambda: RefByUnique<typeof DeclaredAwsLambda>,
    hash: DeclaredAwsLambdaVersionHash,
  };
}
