import { sleep } from '@ehmpathy/uni-time';
import type { HelpfulError } from 'helpful-errors';

/**
 * .what = poll a read until a predicate holds on several CONSECUTIVE reads, or throw on deadline
 * .why = aws writes are eventually consistent — a GET right after a PUT can flap between the old
 *   and new state. this polls until the read stabilizes, and throws if it does not converge within
 *   the deadline (rule.forbid.failhide: a silent exit would return the stale read as success)
 */
export const awaitStableReads = async <T>(input: {
  read: () => Promise<T>;
  isStable: (value: T) => boolean;
  stableReadsRequired: number;
  deadlineMs: number;
  onTimeout: (lastRead: T) => HelpfulError;
}): Promise<T> => {
  const deadline = Date.now() + input.deadlineMs;
  let stableReads = 0;
  let lastRead: T;

  // ⚠️ a do-while, NOT a seeded while. a pre-loop seed read is dead i/o — the loop's first
  // iteration overwrites it before any caller inspects it, so it cost one live aws call per poll
  // and could never be observed. this shape reads exactly once even on a non-positive deadline,
  // which is the only path where a seed could ever have reached `onTimeout`
  do {
    lastRead = await input.read();
    stableReads = input.isStable(lastRead) ? stableReads + 1 : 0;

    // the deadline is re-checked HERE too, so a doomed poll does not sleep a final second
    // before it throws
    if (stableReads < input.stableReadsRequired && Date.now() < deadline)
      await sleep(1000);
  } while (Date.now() < deadline && stableReads < input.stableReadsRequired);

  if (stableReads < input.stableReadsRequired) throw input.onTimeout(lastRead);
  return lastRead;
};
