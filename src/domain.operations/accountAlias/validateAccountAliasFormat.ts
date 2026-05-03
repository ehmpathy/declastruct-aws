import { BadRequestError } from 'helpful-errors';

/**
 * .what = validates alias format matches AWS constraints
 * .why = fail fast with clear error before AWS API call
 *
 * .constraints
 *   - 3-63 characters
 *   - lowercase letters, numbers, and hyphens only
 *   - must start and end with alphanumeric
 *   - no consecutive hyphens
 *
 * .ref = https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateAccountAlias.html
 */
export const validateAccountAliasFormat = (input: {
  alias: string;
}): { valid: true } => {
  const { alias } = input;
  const violations: string[] = [];

  // check length
  if (alias.length < 3 || alias.length > 63) {
    violations.push('must be 3-63 characters');
  }

  // check allowed characters (lowercase, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(alias)) {
    violations.push(
      'must contain only lowercase letters, numbers, and hyphens',
    );
  }

  // check starts with alphanumeric
  if (!/^[a-z0-9]/.test(alias)) {
    violations.push('must start with alphanumeric character');
  }

  // check ends with alphanumeric
  if (!/[a-z0-9]$/.test(alias)) {
    violations.push('must end with alphanumeric character');
  }

  // check no consecutive hyphens
  if (/--/.test(alias)) {
    violations.push('must not contain consecutive hyphens');
  }

  // throw if any violations
  if (violations.length > 0)
    BadRequestError.throw(`invalid account alias format: '${alias}'`, {
      details: violations,
    });

  return { valid: true };
};
