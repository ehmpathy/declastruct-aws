import { BadRequestError } from 'helpful-errors';

/**
 * .what = the three ways the ONE active receipt-rule-set slot can be reconciled toward a
 *   desired set's active status
 * .why = the active slot is a per-account+region singleton; a set op must know whether to
 *   claim it, clear it, or leave it — see rule.forbid.silent-resource-theft
 */
export type ReceiptRuleSetActiveVerdict = 'activate' | 'deactivate' | 'keep';

/**
 * .what = decides how to reconcile the one active receipt-rule-set slot for a desired set
 * .why = separates the user-faced friction guard (a FOREIGN active set must fail loud, never
 *   a silent steal of the one active slot — rule.forbid.silent-resource-theft) from the i/o
 *   that applies it, so the guard is decided one way in one place (pure, unit-tested) rather
 *   than re-derived inline against a live SES call
 * .note
 *   - `activate` — desired is active and the slot is free (none active, or a stale slot to
 *     claim) → make the desired set active
 *   - `deactivate` — desired is inactive but ours currently holds the slot → clear it
 *   - `keep` — no active-slot change needed (ours already active, or both already inactive)
 * .throws BadRequestError — desired is active but a DIFFERENT (foreign) set holds the slot
 */
export const getReceiptRuleSetActiveVerdict = (input: {
  desiredName: string;
  desiredActive: boolean;
  activeName: string | null;
}): ReceiptRuleSetActiveVerdict => {
  const { desiredName, desiredActive, activeName } = input;

  // desired active + a foreign set holds the one slot -> fail loud, never a silent steal
  if (desiredActive && activeName !== desiredName && activeName)
    BadRequestError.throw(
      `receipt rule set "${activeName}" is already the active set for this account+region. it cannot be replaced by "${desiredName}" silently. fix by one of: deactivate "${activeName}" first, or reconcile the two declarations to a single active set`,
      { activeName, desiredName },
    );

  // desired active + slot free (activeName is null here) -> claim it
  if (desiredActive && activeName !== desiredName) return 'activate';

  // desired inactive + ours currently holds the slot -> clear it
  if (!desiredActive && activeName === desiredName) return 'deactivate';

  // otherwise no active-slot change is needed
  return 'keep';
};
