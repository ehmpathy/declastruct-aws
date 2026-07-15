/**
 * .what = builds the ARN of a budget from its account id + name
 * .why = the Budgets tag APIs (ListTagsForResource/TagResource/UntagResource)
 *        address a budget by ARN, but DescribeBudget returns no ARN — so we
 *        construct it from the two parts of the budget's identity
 * .note = the region segment is empty because Budgets is a global service
 * @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsbudgetservice.html
 */
export const asBudgetArn = (input: {
  accountId: string;
  budgetName: string;
}): string => {
  return `arn:aws:budgets::${input.accountId}:budget/${input.budgetName}`;
};
