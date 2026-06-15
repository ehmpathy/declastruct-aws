import { DomainLiteral } from 'domain-objects';
import type { Hash } from 'hash-fns';

/**
 * .what = content hashes that uniquely identify a lambda version
 * .why = groups code and config hashes for version identity
 *
 * .note
 *   - code hash = sha256 of the deployment package (computed by aws)
 *   - config hash = sha256 of config (computed by declastruct, aws does not expose)
 */
export interface DeclaredAwsLambdaVersionHash {
  /**
   * .what = the sha256 hash of the code at publish time
   * .note = computed by aws from the deployment package
   */
  code: Hash;

  /**
   * .what = the sha256 hash of the config at publish time
   * .note = computed by declastruct (aws does not expose this)
   */
  config: Hash;
}

export class DeclaredAwsLambdaVersionHash
  extends DomainLiteral<DeclaredAwsLambdaVersionHash>
  implements DeclaredAwsLambdaVersionHash {}
