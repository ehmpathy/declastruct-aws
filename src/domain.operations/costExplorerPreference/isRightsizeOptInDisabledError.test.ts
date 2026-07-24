import { isRightsizeOptInDisabledError } from './isRightsizeOptInDisabledError';

/**
 * .what = data-driven cases for the rightsize opt-in-disabled detector
 * .why = the detector must fire ONLY on the specific opt-in signal (both phrases), and
 *        must NOT fire on a generic iam denial (which would failhide a real permission bug)
 */
const TEST_CASES: {
  description: string;
  given: { error: unknown };
  expect: boolean;
}[] = [
  {
    description: 'the exact aws opt-in message → true',
    given: {
      error: new Error(
        'Rightsizing EC2 recommendation is an opt-in only feature. You can enable this feature from the PAYER account’s Cost Explorer Preferences page. Normally it may take up to 24 hours in order to generate your rightsizing recommendations.',
      ),
    },
    expect: true,
  },
  {
    description: 'a generic iam denial → false (must NOT be masked as "off")',
    given: {
      error: new Error(
        'User: arn:aws:sts::123:assumed-role/x is not authorized to perform: ce:GetRightsizingRecommendation',
      ),
    },
    expect: false,
  },
  {
    description:
      'only the "opt-in only feature" phrase (no CE preferences) → false',
    given: {
      error: new Error('this is an opt-in only feature somewhere else'),
    },
    expect: false,
  },
  {
    description: 'only "cost explorer preferences" (no opt-in phrase) → false',
    given: { error: new Error('see your cost explorer preferences page') },
    expect: false,
  },
  {
    description: 'a non-Error value → false',
    given: { error: 'opt-in only feature / Cost Explorer Preferences' },
    expect: false,
  },
];

describe('isRightsizeOptInDisabledError', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(
        isRightsizeOptInDisabledError({ error: thisCase.given.error }),
      ).toBe(thisCase.expect);
    }),
  );
});
