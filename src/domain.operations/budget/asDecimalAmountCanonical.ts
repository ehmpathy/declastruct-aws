/**
 * .what = casts a decimal-amount string into its canonical minimal form
 * .why = AWS Budgets echoes a limit amount back with a ".0" suffix (e.g. a declared
 *        "21" reads back as "21.0"). left as-is, the cast-of-actual would never equal
 *        the declared value, so a re-plan would show perpetual drift and the budget
 *        would never converge to KEEP. a cast of both sides to the minimal numeric
 *        form ("21.0" -> "21", "21.50" -> "21.5") makes the round-trip stable
 * .note = declared amounts should already be in this canonical form (our own
 *         resources use "21", not "21.0"); this cast guarantees the read side matches
 */
export const asDecimalAmountCanonical = (input: { amount: string }): string =>
  parseFloat(input.amount).toString();
