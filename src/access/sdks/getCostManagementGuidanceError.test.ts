import { BadRequestError } from 'helpful-errors';

import { getCostManagementGuidanceError } from './getCostManagementGuidanceError';

/**
 * .what = unit cases for the cost-management enablement detector
 * .why = pure transformer — it must guide ONLY on the "please enable" signal and
 *        pass every other error through untouched (so callers rethrow the original)
 */
describe('getCostManagementGuidanceError', () => {
  it('guides on the budgets "enable budgets first" signal', () => {
    const error = new Error(
      'Account 805192865516 is a linked account. To enable budgets for your account, ask the payer account to enable budgets first.',
    );
    const guided = getCostManagementGuidanceError({ error });
    expect(guided).toBeInstanceOf(BadRequestError);
    expect(guided?.message).toContain('not enabled');
  });

  it('guides on the cost explorer "enable Cost Explorer" signal', () => {
    const error = new Error('Please enable Cost Explorer to use this feature.');
    const guided = getCostManagementGuidanceError({ error });
    expect(guided).toBeInstanceOf(BadRequestError);
  });

  it('passes an iam denial through untouched (returns null)', () => {
    const error = new Error(
      'User: ...demo-agent is not authorized to perform: budgets:ModifyBudget because no identity-based policy allows the budgets:ModifyBudget action',
    );
    expect(getCostManagementGuidanceError({ error })).toBeNull();
  });

  it('passes a non-Error value through untouched (returns null)', () => {
    expect(getCostManagementGuidanceError({ error: 'oops' })).toBeNull();
  });
});
