import { given, then } from 'test-fns';

import { sumDecimalStrings } from './sumDecimalStrings';

describe('sumDecimalStrings', () => {
  given('[case1] an empty list', () => {
    then('it returns "0"', () => {
      expect(sumDecimalStrings({ amounts: [] })).toBe('0');
    });
  });

  given('[case2] whole-number amounts', () => {
    then('it sums them exactly', () => {
      expect(sumDecimalStrings({ amounts: ['12', '4', '5'] })).toBe('21');
    });
  });

  given('[case3] amounts with a mix of fractional lengths', () => {
    then('it lifts to the widest scale and sums exactly', () => {
      expect(sumDecimalStrings({ amounts: ['12.10', '4.5', '0'] })).toBe(
        '16.60',
      );
    });
  });

  given('[case4] high-precision amounts that float64 would drift on', () => {
    then('it preserves every decimal digit exactly', () => {
      // 0.1 + 0.2 is the classic float64 trap (0.30000000000000004)
      expect(sumDecimalStrings({ amounts: ['0.1', '0.2'] })).toBe('0.3');
    });

    then('it sums long AWS-style decimals without loss', () => {
      expect(
        sumDecimalStrings({
          amounts: ['39.1603300457', '4.3200000000', '0.0000000001'],
        }),
      ).toBe('43.4803300458');
    });
  });

  given('[case5] negative amounts (a credit or refund on net cost)', () => {
    then('it nets a partial credit against spend exactly', () => {
      expect(sumDecimalStrings({ amounts: ['12.10', '-4.60'] })).toBe('7.50');
    });

    then('it yields a negative total when credits exceed spend', () => {
      expect(sumDecimalStrings({ amounts: ['4.32', '-10.00'] })).toBe('-5.68');
    });

    then('it preserves a sub-unit negative amount exactly', () => {
      expect(sumDecimalStrings({ amounts: ['-0.05'] })).toBe('-0.05');
    });
  });
});
