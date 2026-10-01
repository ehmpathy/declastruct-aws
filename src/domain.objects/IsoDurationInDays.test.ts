import { getError, given, then, when } from 'test-fns';

import { isIsoDurationInDays } from './IsoDurationInDays';

/**
 * .what = unit coverage for the positive whole-day duration guard
 * .why = the type admits `{ days: number }`, so a fractional `{ days: 30.5 }`, a zero `{ days: 0 }`,
 *   and a negative `{ days: -1 }` are all COMPILE-legal values the type cannot reject (F17 fixed the
 *   unit, not the range). this guard is the one runtime check that closes them before a bad day-count
 *   reaches aws, which expires on WHOLE, POSITIVE days only — so its reject path is the behavior that
 *   owes a clamp (rule.require.clamp-edge-cases)
 */
describe('isIsoDurationInDays', () => {
  given('[case1] a set of candidate values', () => {
    const CASES = [
      {
        description: 'a positive whole-day duration passes',
        value: { days: 30 },
        ok: true,
      },
      { description: 'one day passes', value: { days: 1 }, ok: true },
      { description: 'zero days fails', value: { days: 0 }, ok: false },
      {
        description: 'a negative day-count fails',
        value: { days: -1 },
        ok: false,
      },
      {
        description: 'a fractional day fails',
        value: { days: 30.5 },
        ok: false,
      },
      { description: 'a non-object fails', value: 30, ok: false },
      { description: 'null fails', value: null, ok: false },
      {
        description: 'a days-less object fails',
        value: { hours: 24 },
        ok: false,
      },
    ];

    when('[t0] each is assessed', () => {
      CASES.forEach((thisCase) =>
        then(thisCase.description, () => {
          expect(isIsoDurationInDays.assess(thisCase.value)).toEqual(
            thisCase.ok,
          );
        }),
      );
    });
  });

  given('[case2] a positive whole-day duration', () => {
    when('[t0] it is assured', () => {
      then('it returns unchanged', () => {
        expect(isIsoDurationInDays.assure({ days: 7 })).toEqual({ days: 7 });
      });
    });
  });

  given('[case3] a day-count the type admits but aws rejects', () => {
    when('[t0] a fractional day is assured', () => {
      then('it throws loud (the one check the type cannot carry)', () => {
        const error = getError(() =>
          isIsoDurationInDays.assure({ days: 30.5 }),
        );
        expect(error.message).toContain('isIsoDurationInDays');
      });
    });

    when('[t1] a zero day-count is assured', () => {
      then('it throws loud (aws requires a positive count)', () => {
        const error = getError(() => isIsoDurationInDays.assure({ days: 0 }));
        expect(error.message).toContain('isIsoDurationInDays');
      });
    });

    when('[t2] a negative day-count is assured', () => {
      then('it throws loud', () => {
        const error = getError(() => isIsoDurationInDays.assure({ days: -1 }));
        expect(error.message).toContain('isIsoDurationInDays');
      });
    });
  });
});
