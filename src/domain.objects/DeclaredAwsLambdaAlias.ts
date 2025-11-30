import { DomainEntity, RefByUnique } from 'domain-objects';

import { DeclaredAwsLambda } from './DeclaredAwsLambda';
import { DeclaredAwsLambdaVersion } from './DeclaredAwsLambdaVersion';

/**
 * .what = a named pointer to a lambda version
 * .why = enables stable endpoints that can be updated to point to different versions
 *
 * .identity
 *   - @primary = [arn] — qualified arn including alias name (e.g., :LIVE)
 *   - @unique = [lambda, name] — alias name is unique per function
 *
 * .note
 *   - aliases are mutable — they can be retargeted to different versions
 *   - multiple aliases can point to the same version (key for the wish)
 *   - alias names cannot be purely numeric (to avoid confusion with version numbers)
 *   - alias names: 1-128 chars, pattern: (?!^[0-9]+$)([a-zA-Z0-9-_]+)
 *
 * .wish-mapping
 *   - expect=LIVE → alias name 'expect-LIVE'
 *   - expect=IDLE → alias name 'expect-IDLE'
 *   - commit=$hash → alias name 'commit-abc1234'
 *   - pr=XYZ → alias name 'pr-42'
 */
export interface DeclaredAwsLambdaAlias {
  /**
   * .what = the qualified arn of the alias
   * .note = @metadata — assigned by aws; includes alias name suffix
   * .example = 'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE'
   */
  arn?: string;

  /**
   * .what = the alias name
   * .note = @unique(composite: lambda + name) — unique per function
   * .constraint = 1-128 chars, cannot be purely numeric
   */
  name: string;

  /**
   * .what = reference to the parent lambda function
   */
  lambda: RefByUnique<typeof DeclaredAwsLambda>;

  /**
   * .what = reference to the version this alias points to
   */
  version: RefByUnique<typeof DeclaredAwsLambdaVersion>;

  /**
   * .what = optional description
   */
  description?: string;

  /**
   * .what = optional traffic routing configuration for weighted deployments
   * .note = enables canary/blue-green deployments by splitting traffic between versions
   */
  routingConfig?: {
    /**
     * .what = additional versions to route traffic to
     * .format = { versionNumber: weight } where weight is 0.0-1.0
     * .example = { '6': 0.1 } → 10% to version 6, 90% to primary version
     */
    additionalVersionWeights?: Record<string, number>;
  };
}

export class DeclaredAwsLambdaAlias
  extends DomainEntity<DeclaredAwsLambdaAlias>
  implements DeclaredAwsLambdaAlias
{
  /**
   * .what = qualified arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = alias is uniquely identified by function + alias name
   */
  public static unique = ['lambda', 'name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — version and routingConfig are user-updatable
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   * .note = lambda and version are RefByUnique refs, not full domain objects
   */
  public static nested = {
    lambda: RefByUnique<typeof DeclaredAwsLambda>,
    version: RefByUnique<typeof DeclaredAwsLambdaVersion>,
  };
}
