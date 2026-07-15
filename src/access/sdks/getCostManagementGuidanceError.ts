import { BadRequestError } from 'helpful-errors';

/**
 * .what = derives a guided error when AWS reports budgets / cost explorer is off
 * .why = AWS exposes NO api to enable Cost Explorer / Budgets — it is a one-time,
 *        console-only activation on the payer (management) account. but we CAN read
 *        the state via any budgets/ce call: a "please enable" response is a reliable
 *        signal it is off (distinct from an iam denial, which says "no identity-based
 *        policy allows …"). so we translate that cryptic aws error into a clear,
 *        actionable one that guides the human to flip the switch by hand, then re-apply
 * .note = returns null for any other error, so the caller rethrows the original
 */
export const getCostManagementGuidanceError = (input: {
  error: unknown;
}): BadRequestError | null => {
  if (!(input.error instanceof Error)) return null;

  // the enablement signal: aws asks to "enable budgets" / "enable cost explorer"
  const isEnablementError = /enable (budgets|cost explorer)/i.test(
    input.error.message,
  );
  if (!isEnablementError) return null;

  return new BadRequestError(
    'aws budgets / cost explorer is not enabled for this account. this is a one-time, console-only activation — aws exposes no api to enable it. turn it on once in the payer (management) account, then re-apply.',
    {
      how: [
        'sign in to the payer (management) account (NOT the linked member account — the aws error names which account is linked)',
        'open Cost Explorer: https://us-east-1.console.aws.amazon.com/cost-management/home?region=us-east-1#/cost-explorer',
        'choose "Launch Cost Explorer" — this also enables Budgets',
        'confirm Budgets is reachable: https://us-east-1.console.aws.amazon.com/cost-management/home?region=us-east-1#/budgets',
        'wait for activation (minutes up to ~24h — the console shows "check back in 24 hours"), then re-run apply',
      ],
      note: 'once on, the read succeeds and the resource converges to KEEP',
      links: {
        costExplorer:
          'https://us-east-1.console.aws.amazon.com/cost-management/home?region=us-east-1#/cost-explorer',
        budgets:
          'https://us-east-1.console.aws.amazon.com/cost-management/home?region=us-east-1#/budgets',
      },
      awsError: input.error.message,
    },
  );
};
