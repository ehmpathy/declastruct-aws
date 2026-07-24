import { given, then } from 'test-fns';

import { isResourceLevelDataOptInDisabledError } from './isResourceLevelDataOptInDisabledError';

const asNamedError = (name: string, message = 'x'): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const TEST_CASES = [
  {
    description: 'the live off-signal (AccessDenied message) → off (true)',
    given: {
      error: asNamedError(
        'AccessDeniedException',
        "Resource-level data granularity is an opt-in only feature. You can be enable this feature from the PAYER account's Cost Explorer Settings page.",
      ),
    },
    expect: true,
  },
  {
    description:
      'a real iam AccessDenied (not authorized) → not the off-signal (false)',
    given: {
      error: asNamedError(
        'AccessDeniedException',
        'User is not authorized to perform: ce:GetCostAndUsageWithResources',
      ),
    },
    expect: false,
  },
  {
    description:
      'a DataUnavailableException (enabled but empty) → NOT off (false)',
    given: {
      error: asNamedError(
        'DataUnavailableException',
        'The requested data is unavailable.',
      ),
    },
    expect: false,
  },
  {
    description:
      'a look-alike message with only one phrase → NOT matched (false)',
    given: {
      error: asNamedError(
        'AccessDeniedException',
        'this is an opt-in only feature',
      ),
    },
    expect: false,
  },
  {
    description: 'a non-Error value → false',
    given: { error: 'resource-level data granularity opt-in only feature' },
    expect: false,
  },
] as const;

describe('isResourceLevelDataOptInDisabledError', () => {
  TEST_CASES.forEach((thisCase) =>
    given(thisCase.description, () => {
      then(`it returns ${thisCase.expect}`, () => {
        expect(
          isResourceLevelDataOptInDisabledError({
            error: thisCase.given.error,
          }),
        ).toBe(thisCase.expect);
      });
    }),
  );
});
