import { DomainLiteral } from 'domain-objects';

/**
 * .what = a flat predicate to scope which costs a cost report includes
 * .why = shared by the whole cost-report family (spend-observed, spend-forecast,
 *        rightsize + purchase-plan recommendations), so it lives at the common ancestor
 *        rather than inside any one report. v1 models a single flat { dimension, values }
 *        predicate; the api's full recursive Expression tree is a disclosed v1 narrow
 *        (see vision)
 */
export interface DeclaredAwsCostReportFilter {
  /**
   * .what = the dimension to filter on
   * .example = 'SERVICE'
   */
  dimension: string;

  /**
   * .what = the values to include for that dimension
   */
  values: string[];
}

export class DeclaredAwsCostReportFilter
  extends DomainLiteral<DeclaredAwsCostReportFilter>
  implements DeclaredAwsCostReportFilter {}
