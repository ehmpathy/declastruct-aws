import { given, then, when } from 'test-fns';

import type { S3BucketLifecycleParams } from '@src/domain.objects/S3BucketLifecycleParams';

import { hasS3BucketLifecycleRuleAction } from './hasS3BucketLifecycleRuleAction';

/**
 * .what = unit coverage for the "does this lifecycle need a rule at all" check
 * .why = a version-state-only lifecycle writes no rule; any one action must write one
 */
describe('hasS3BucketLifecycleRuleAction', () => {
  const base: S3BucketLifecycleParams = {
    transitions: [],
    objectExpireDays: null,
    versionExpiry: null,
    multipartExpireDays: null,
  };

  given('[case1] all-empty params (a version-state-only lifecycle)', () => {
    when('[t0] it is checked', () => {
      then('it has no rule action', () => {
        expect(hasS3BucketLifecycleRuleAction(base)).toEqual(false);
      });
    });
  });

  given('[case2] params with exactly one action', () => {
    when('[t0] the action is a transition', () => {
      then('it has a rule action', () => {
        expect(
          hasS3BucketLifecycleRuleAction({
            ...base,
            transitions: [{ afterDays: 30, class: 'GLACIER_IR' }],
          }),
        ).toEqual(true);
      });
    });

    when('[t1] the action is an object expiry', () => {
      then('it has a rule action', () => {
        expect(
          hasS3BucketLifecycleRuleAction({ ...base, objectExpireDays: 30 }),
        ).toEqual(true);
      });
    });

    when('[t2] the action is a version expiry', () => {
      then('it has a rule action', () => {
        expect(
          hasS3BucketLifecycleRuleAction({
            ...base,
            versionExpiry: { afterDays: 30, keep: null },
          }),
        ).toEqual(true);
      });
    });

    when('[t3] the action is a multipart expiry', () => {
      then('it has a rule action', () => {
        expect(
          hasS3BucketLifecycleRuleAction({ ...base, multipartExpireDays: 7 }),
        ).toEqual(true);
      });
    });
  });
});
