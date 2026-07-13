import { asDecimalAmountCanonical } from './asDecimalAmountCanonical';

/**
 * .what = unit cases for the decimal-amount canonical cast
 * .why = pure transformer — it must strip an AWS ".0" suffix so a declared "21"
 *        round-trips against the "21.0" AWS echoes, without loss for real decimals
 */
const TEST_CASES = [
  {
    description: 'strips the aws ".0" suffix from a whole amount',
    given: { amount: '21.0' },
    expect: { output: '21' },
  },
  {
    description: 'leaves an already-canonical whole amount unchanged',
    given: { amount: '21' },
    expect: { output: '21' },
  },
  {
    description: 'strips a redundant zero from a decimal amount',
    given: { amount: '21.50' },
    expect: { output: '21.5' },
  },
  {
    description: 'leaves a genuine two-decimal amount intact',
    given: { amount: '21.55' },
    expect: { output: '21.55' },
  },
] as const;

describe('asDecimalAmountCanonical', () => {
  TEST_CASES.map((thisCase) =>
    it(thisCase.description, () => {
      const output = asDecimalAmountCanonical({ amount: thisCase.given.amount });
      expect(output).toBe(thisCase.expect.output);
    }),
  );
});
