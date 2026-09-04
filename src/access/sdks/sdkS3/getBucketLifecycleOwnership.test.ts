import { DECLASTRUCT_LIFECYCLE_RULE_ID } from './declastructLifecycleRuleId';
import { getBucketLifecycleOwnership } from './getBucketLifecycleOwnership';

/**
 * .what = unit coverage for the pure lifecycle-ownership verdict
 * .why = the get must return ONLY the declastruct-owned rule and the put must detect foreign
 *   rules to fail loud — a misread here is silent-resource-theft, so every ownership case is
 *   pinned (owned-only, foreign-only, mixed, empty)
 */
describe('getBucketLifecycleOwnership', () => {
  test('owned rule present → returned, no foreign', () => {
    const verdict = getBucketLifecycleOwnership({
      rules: [{ ID: DECLASTRUCT_LIFECYCLE_RULE_ID }],
    });
    expect(verdict.owned).toEqual({ ID: DECLASTRUCT_LIFECYCLE_RULE_ID });
    expect(verdict.foreignRuleIds).toEqual([]);
  });

  test('foreign rule only → owned is null, foreign id surfaced', () => {
    const verdict = getBucketLifecycleOwnership({
      rules: [{ ID: 'someones-console-rule' }],
    });
    expect(verdict.owned).toEqual(null);
    expect(verdict.foreignRuleIds).toEqual(['someones-console-rule']);
  });

  test('mixed → owned returned AND foreign surfaced', () => {
    const verdict = getBucketLifecycleOwnership({
      rules: [
        { ID: 'someones-console-rule' },
        { ID: DECLASTRUCT_LIFECYCLE_RULE_ID },
      ],
    });
    expect(verdict.owned).toEqual({ ID: DECLASTRUCT_LIFECYCLE_RULE_ID });
    expect(verdict.foreignRuleIds).toEqual(['someones-console-rule']);
  });

  test('a foreign rule with no id → surfaced as (unnamed)', () => {
    const verdict = getBucketLifecycleOwnership({ rules: [{}] });
    expect(verdict.owned).toEqual(null);
    expect(verdict.foreignRuleIds).toEqual(['(unnamed)']);
  });

  test('no rules → owned null, no foreign', () => {
    const verdict = getBucketLifecycleOwnership({ rules: [] });
    expect(verdict.owned).toEqual(null);
    expect(verdict.foreignRuleIds).toEqual([]);
  });
});
