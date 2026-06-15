import { DomainLiteral, RefByUnique } from 'domain-objects';

import type { DeclaredAwsLambda } from './DeclaredAwsLambda';
import { DeclaredAwsLambdaVersionHash } from './DeclaredAwsLambdaVersionHash';

/**
 * .what = a reference to a lambda version by its unique key
 * .why = enables type-safe references to versions with proper nested declarations
 *
 * .note
 *   - this is a DomainLiteral wrapper around RefByUnique<typeof DeclaredAwsLambdaVersion>
 *   - needed because RefByUnique is a type helper, not a class with nested declarations
 *   - required for domain-objects to properly traverse nested hash structure
 */
export interface DeclaredAwsLambdaVersionRef {
  /**
   * .what = reference to the parent lambda function
   */
  lambda: RefByUnique<typeof DeclaredAwsLambda>;

  /**
   * .what = the hash that uniquely identifies this version
   */
  hash: DeclaredAwsLambdaVersionHash;
}

export class DeclaredAwsLambdaVersionRef
  extends DomainLiteral<DeclaredAwsLambdaVersionRef>
  implements DeclaredAwsLambdaVersionRef
{
  /**
   * .what = nested domain object definitions
   * .note = hash is a DeclaredAwsLambdaVersionHash with code and config hashes
   */
  public static nested = {
    hash: DeclaredAwsLambdaVersionHash,
  };
}
