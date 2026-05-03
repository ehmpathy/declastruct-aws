import { BadRequestError, HelpfulError } from 'helpful-errors';

/**
 * .what = transforms AWS errors into domain-appropriate errors
 * .why = centralizes error transform logic for testability
 * .note
 *   - EntityAlreadyExistsException -> BadRequestError (alias taken in partition)
 *   - all other errors -> HelpfulError with cause and context
 */
export const asAccountAliasErrorFromAwsError = (input: {
  error: Error;
  alias: string;
  previousAlias: string | null;
}): never => {
  const { error, alias, previousAlias } = input;

  // partition collision — alias taken by another account
  if (error.name === 'EntityAlreadyExistsException') {
    BadRequestError.throw(`alias '${alias}' already in use in partition`, {
      hint: "AWS account aliases must be unique across all accounts in your partition (aws, aws-cn, aws-us-gov). Try a namespaced alias like 'yourorg-commonly-used-name'.",
      alias,
    });
  }

  // wrap all other errors with context
  throw new HelpfulError('aws.setAccountAlias error', {
    cause: error,
    context: {
      errorName: error.name,
      errorMessage: error.message,
      alias,
      previousAlias,
    },
  });
};
