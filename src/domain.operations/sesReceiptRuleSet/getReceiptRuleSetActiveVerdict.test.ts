import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import {
  getReceiptRuleSetActiveVerdict,
  type ReceiptRuleSetActiveVerdict,
} from './getReceiptRuleSetActiveVerdict';

/**
 * .what = proves the active-slot reconcile guard decides every case correctly
 * .why = the one active receipt-rule-set slot is a per-account+region singleton; this
 *   verdict is the user-faced friction point that must fail loud on a FOREIGN active set
 *   (rule.forbid.silent-resource-theft, rule.forbid.friction-hazards). a wrong verdict either
 *   silently steals the slot or misfires a block
 */
describe('getReceiptRuleSetActiveVerdict', () => {
  const cases: {
    description: string;
    desiredName: string;
    desiredActive: boolean;
    activeName: string | null;
    verdict: ReceiptRuleSetActiveVerdict;
  }[] = [
    {
      description: 'desired active + no set active -> claim the free slot',
      desiredName: 'ours',
      desiredActive: true,
      activeName: null,
      verdict: 'activate',
    },
    {
      description: 'desired active + ours already active -> keep',
      desiredName: 'ours',
      desiredActive: true,
      activeName: 'ours',
      verdict: 'keep',
    },
    {
      description: 'desired inactive + ours currently active -> clear it',
      desiredName: 'ours',
      desiredActive: false,
      activeName: 'ours',
      verdict: 'deactivate',
    },
    {
      description: 'desired inactive + no set active -> keep',
      desiredName: 'ours',
      desiredActive: false,
      activeName: null,
      verdict: 'keep',
    },
    {
      description:
        'desired inactive + a foreign set active -> keep (we do not claim it)',
      desiredName: 'ours',
      desiredActive: false,
      activeName: 'theirs',
      verdict: 'keep',
    },
  ];

  given('a desired set and the current active-slot holder', () => {
    cases.forEach((each) => {
      when(`[${each.description}]`, () => {
        then(`the verdict is "${each.verdict}"`, () => {
          expect(
            getReceiptRuleSetActiveVerdict({
              desiredName: each.desiredName,
              desiredActive: each.desiredActive,
              activeName: each.activeName,
            }),
          ).toEqual(each.verdict);
        });
      });
    });
  });

  given(
    'desired active but a FOREIGN set already holds the one active slot',
    () => {
      when('the verdict is derived', () => {
        then('it fails loud with a BadRequestError that states the fix', () => {
          const error = getError(() =>
            getReceiptRuleSetActiveVerdict({
              desiredName: 'ours',
              desiredActive: true,
              activeName: 'theirs',
            }),
          );
          expect(error).toBeInstanceOf(BadRequestError);
          expect(error.message).toContain('"theirs" is already the active set');
          expect(error.message).toContain('deactivate "theirs" first');
          expect(error.message).toMatchSnapshot();
        });
      });
    },
  );
});
