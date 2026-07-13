import { DomainLiteral } from 'domain-objects';

/**
 * .what = a budget threshold — a quantity plus the unit it is read in
 * .why = shared by both a budget notification (an alert tier) and a budget action
 *        (a guard); each fires when spend crosses this bar. one shape keeps the two
 *        symmetric. maps to AWS's { Threshold + ThresholdType } (notification) and
 *        { ActionThresholdValue + ActionThresholdType } (action)
 * .note
 *   - quant is read per unit: a percent of the budget cap, or an absolute amount
 */
export interface DeclaredAwsBudgetThreshold {
  /**
   * .what = the quantity that fires the alert / guard
   * .note = read per unit (a percent of the cap, or an absolute amount)
   */
  quant: number;

  /**
   * .what = how the quant is read
   * .constraint = one of PERCENTAGE | ABSOLUTE_VALUE (maps to AWS ThresholdType)
   */
  unit: 'PERCENTAGE' | 'ABSOLUTE_VALUE';
}

export class DeclaredAwsBudgetThreshold
  extends DomainLiteral<DeclaredAwsBudgetThreshold>
  implements DeclaredAwsBudgetThreshold {}
