import { DomainLiteral } from 'domain-objects';

/**
 * .what = the spend cap of a budget — an amount in a currency unit
 * .why = mirrors AWS's `Spend` shape ({ Amount, Unit }) as the budget cap
 * .note
 *   - amount is a decimal string (AWS models it as a string, e.g. '21')
 *   - unit is the currency/usage unit (e.g. 'USD')
 */
export interface DeclaredAwsBudgetLimit {
  /**
   * .what = the cap amount as a decimal string
   * .constraint = a non-negative decimal, e.g. '21' or '21.00'
   */
  amount: string;

  /**
   * .what = the unit of the amount (currency for COST budgets)
   * .constraint = e.g. 'USD'
   */
  unit: string;
}

export class DeclaredAwsBudgetLimit
  extends DomainLiteral<DeclaredAwsBudgetLimit>
  implements DeclaredAwsBudgetLimit {}
