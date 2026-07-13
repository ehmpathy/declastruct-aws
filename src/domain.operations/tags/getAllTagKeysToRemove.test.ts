import { getAllTagKeysToRemove } from './getAllTagKeysToRemove';

/**
 * .what = unit cases for the tag-key-to-remove derive
 * .why = pure transformer — verify the untag-diff across the shapes it sees
 */
const TEST_CASES = [
  {
    description: 'drops keys absent from desired',
    given: { before: { a: '1', b: '2' }, desired: { a: '1' } },
    expect: ['b'],
  },
  {
    description: 'keeps no key when desired covers all',
    given: { before: { a: '1' }, desired: { a: '9' } },
    expect: [],
  },
  {
    description: 'drops every key when desired is null',
    given: { before: { a: '1', b: '2' }, desired: null },
    expect: ['a', 'b'],
  },
  {
    description: 'drops no key when before is null',
    given: { before: null, desired: { a: '1' } },
    expect: [],
  },
] as const;

describe('getAllTagKeysToRemove', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const output = getAllTagKeysToRemove({
        before: thisCase.given.before,
        desired: thisCase.given.desired,
      });
      expect(output).toEqual(thisCase.expect);
    }),
  );
});
