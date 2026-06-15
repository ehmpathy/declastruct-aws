import { DomainLiteral } from 'domain-objects';
import type { Hash } from 'hash-fns';

/**
 * .what = the code configuration for a lambda function
 * .why = ties together the local zip path and its content hash
 * .note
 *   - zipUri is the local path to the deployment package
 *   - hash is the sha256 of the zip; compute via calcAwsLambdaCodeHash({ of: { zipUri } })
 */
export interface DeclaredAwsLambdaCode {
  /**
   * .what = the local path to the lambda's deployment zip
   */
  zipUri: string;

  /**
   * .what = the sha256 hash of the zip contents
   * .note = compute via calcAwsLambdaCodeHash({ of: { zipUri } })
   */
  hash: Hash;
}

export class DeclaredAwsLambdaCode
  extends DomainLiteral<DeclaredAwsLambdaCode>
  implements DeclaredAwsLambdaCode {}
