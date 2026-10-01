import { HelpfulError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { awaitStableReads } from './awaitStableReads';

/**
 * .what = unit coverage for the consecutive-stable-reads poll
 * .why = the poll guards every read-after-write in the set path; it must converge on exactly the
 *   required count, reset on a stale read, and fail loud past its deadline
 */
describe('awaitStableReads', () => {
  given('[case1] a read that is stable from the first call', () => {
    when('[t0] the poll requires 3 stable reads', () => {
      then(
        'it resolves with exactly 3 reads — no pre-loop seed read',
        async () => {
          let callCount = 0;
          const result = await awaitStableReads({
            read: async () => {
              callCount++;
              return 'stable';
            },
            isStable: (v) => v === 'stable',
            stableReadsRequired: 3,
            deadlineMs: 5000,
            onTimeout: () => new HelpfulError('timed out', {}),
          });
          expect(result).toEqual('stable');
          // 🔴 EXACTLY 3 — one live aws call per stable read, and not one more. a pre-loop seed read
          // would make this 4, which is the dead-i/o shape this poll deliberately does not have
          expect(callCount).toEqual(3);
        },
      );
    });
  });

  given('[case2] a read that turns stable after one stale read', () => {
    when('[t0] the poll requires 3 stable reads', () => {
      then(
        'the counter resets on the stale read, then it resolves',
        async () => {
          const values = ['stale', 'stable', 'stable', 'stable'];
          let idx = 0;
          const result = await awaitStableReads({
            read: async () => values[Math.min(idx++, values.length - 1)]!,
            isStable: (v) => v === 'stable',
            stableReadsRequired: 3,
            deadlineMs: 5000,
            onTimeout: () => new HelpfulError('timed out', {}),
          });
          expect(result).toEqual('stable');
          expect(idx).toEqual(4);
        },
      );
    });
  });

  given('[case3] a read that never turns stable', () => {
    when('[t0] the deadline is short', () => {
      then('it throws the timeout error', async () => {
        const error = await getError(
          awaitStableReads({
            read: async () => 'flap',
            isStable: () => false,
            stableReadsRequired: 3,
            deadlineMs: 50,
            onTimeout: (last) =>
              new HelpfulError('did not converge', { lastRead: last }),
          }),
        );
        expect(error.message).toContain('did not converge');
      });
    });

    when('[t1] the deadline has already passed', () => {
      then(
        'it reads exactly once, so onTimeout gets a real lastRead',
        async () => {
          // ⚠️ the one path where a seed read could ever have been observed: a non-positive deadline,
          // where the loop condition is false on its first evaluation. the do-while still performs
          // the one read `onTimeout` needs, rather than report a `lastRead` it never took
          let callCount = 0;
          const error = await getError(
            awaitStableReads({
              read: async () => {
                callCount++;
                return 'flap';
              },
              isStable: () => false,
              stableReadsRequired: 3,
              deadlineMs: 0,
              onTimeout: (last) =>
                new HelpfulError('did not converge', { lastRead: last }),
            }),
          );
          expect(error.message).toContain('did not converge');
          expect(callCount).toEqual(1);
        },
      );
    });
  });
});
