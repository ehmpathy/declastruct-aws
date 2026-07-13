import { DomainLiteral } from 'domain-objects';

/**
 * .what = cloudwatch metric dimensions as a name -> value map
 * .why = a metric alarm scopes its metric by dimensions (e.g. { Currency: 'USD' }
 *        for the estimated-charges metric). declared as a DomainLiteral (not a raw
 *        Record) so declastruct's plan-diff can safely manipulate it — a raw nested
 *        object trips assertDomainObjectIsSafeToManipulate, mirrors DeclaredAwsTags
 */
export interface DeclaredAwsCloudwatchDimensions {
  [key: string]: string;
}
export class DeclaredAwsCloudwatchDimensions
  extends DomainLiteral<DeclaredAwsCloudwatchDimensions>
  implements DeclaredAwsCloudwatchDimensions {}
