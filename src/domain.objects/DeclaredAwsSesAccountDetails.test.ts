import { getError } from 'test-fns';

import {
  isSesReviewStatus,
  SES_REVIEW_STATUSES,
} from './DeclaredAwsSesAccountDetails';

/**
 * .what = unit coverage for the SES review-status guard
 * .why = the read boundary maps SES's ReviewDetails.Status enum; a value outside the modeled
 *   union must fail loud (assure), never silently mistype and skew a plan diff
 *   (rule.require.assure-via-type-checks)
 */
describe('isSesReviewStatus', () => {
  describe('assess (boolean narrow)', () => {
    SES_REVIEW_STATUSES.forEach((status) => {
      test(`accepts the modeled status ${status}`, () => {
        expect(isSesReviewStatus(status)).toBe(true);
      });
    });

    test('rejects a value outside the union', () => {
      expect(isSesReviewStatus('IN_REVIEW')).toBe(false);
    });

    test('rejects an empty string', () => {
      expect(isSesReviewStatus('')).toBe(false);
    });
  });

  describe('assure (fail-loud assert)', () => {
    test('returns the narrowed value for a modeled status', () => {
      expect(isSesReviewStatus.assure('PENDING')).toBe('PENDING');
    });

    test('throws for a value outside the union', () => {
      const error = getError(() => isSesReviewStatus.assure('IN_REVIEW'));
      expect(error).toBeDefined();
      expect(error.message).toContain('isSesReviewStatus');
    });
  });
});
