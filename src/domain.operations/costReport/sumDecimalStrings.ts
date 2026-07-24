/**
 * .what = sums a set of decimal-string amounts EXACTLY, without float64
 * .why = money amounts are high-precision decimal strings (AWS returns values like
 *        '39.1603300457'); a float64 `Number()` sum drifts at the last digits, and the
 *        vision forbids a bare `number` for money ("would silently corrupt cents"). so we
 *        sum as common-scale BigInt integers and format back to a decimal string, which
 *        preserves every digit exactly
 * .note = it handles a mix of fractional lengths — it lifts all amounts to the widest scale
 */
export const sumDecimalStrings = (input: { amounts: string[] }): string => {
  if (input.amounts.length === 0) return '0';

  // the widest fractional length sets the common integer scale
  const scale = input.amounts.reduce((max, amount) => {
    const dot = amount.indexOf('.');
    const frac = dot === -1 ? 0 : amount.length - dot - 1;
    return frac > max ? frac : max;
  }, 0);

  // lift each amount to a common-scale integer, then sum as BigInt (exact)
  const total = input.amounts.reduce((acc, amount) => {
    const [whole, frac = ''] = amount.split('.');
    const lifted = `${whole}${frac.padEnd(scale, '0')}`;
    return acc + BigInt(lifted);
  }, 0n);

  // format the BigInt back to a decimal string at the common scale
  if (scale === 0) return total.toString();
  const sign = total < 0n ? '-' : '';
  const digits = (total < 0n ? -total : total)
    .toString()
    .padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const frac = digits.slice(digits.length - scale);
  return `${sign}${whole}.${frac}`;
};
