import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';
import type { Hash } from 'hash-fns';

import type { DeclaredAwsLambda } from './DeclaredAwsLambda';

/**
 * .what = an immutable version of a lambda function
 * .why = represents a published snapshot that can be referenced by aliases
 *
 * .identity
 *   - @primary = [arn] — qualified arn including version number (e.g., :5)
 *   - @unique = [lambda, hash] — a version is uniquely identified by function + code + config fingerprint
 *
 * .note
 *   - versions are immutable — once published, they cannot be modified
 *   - the version number is assigned sequentially by aws and never reused
 *   - PublishVersion is idempotent — if code+config unchanged, returns same version
 *   - configSha256 is computed by declastruct since aws does not expose it
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
   * .what = the hashes that uniquely identify this version's content
   * .note = part of the unique key — same code+config = same version
   */
  hash: {
    /**
     * .what = the sha256 hash of the code at publish time
     * .note = part of the unique key — same code = same hash
     */
    code: Hash;

    /**
     * .what = the sha256 hash of the config at publish time
     * .note
     *   - computed by declastruct (aws does not expose this)
     *   - includes: handler, runtime, memory, timeout, envars, role, vpc, layers, etc.
     *   - part of the unique key — same config = same hash
     */
    config: Hash;
  };

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
   * .note = lambda is RefByUnique ref, not full domain object
   */
  public static nested = {
    lambda: RefByUnique<typeof DeclaredAwsLambda>,
    hash: DomainLiteral,
  };
}
