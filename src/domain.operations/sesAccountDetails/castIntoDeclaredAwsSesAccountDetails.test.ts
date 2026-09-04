import { getError } from 'test-fns';

import { castIntoDeclaredAwsSesAccountDetails } from './castIntoDeclaredAwsSesAccountDetails';

/**
 * .what = unit coverage for the raw SES GetAccount → domain cast
 * .why = a pure boundary transform that holds the whole drift model: it maps the ASYNC
 *   review into a convergent `productionAccess` (so an in-flight request reads as a normal
 *   KEEP, a denied/failed one re-arms a retry), passes the readonly nuance through, and fails
 *   loud on an aws state outside the modeled unions
 */
describe('castIntoDeclaredAwsSesAccountDetails', () => {
  // the fields an account with a request always carries (Details submitted with the request)
  const withRequest = {
    region: 'us-east-1',
    mailType: 'TRANSACTIONAL' as const,
    websiteUrl: 'https://ehmpathy.com',
    contactLanguage: 'EN' as const,
    additionalContactEmails: null,
  };

  describe('the productionAccess drift model', () => {
    test('granted flag → enabled', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: true,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'GRANTED',
      });
      expect(details.productionAccess).toEqual('enabled');
    });

    test('review PENDING (flag still false) → enabled, so an in-flight request reads KEEP', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: false,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'PENDING',
      });
      expect(details.productionAccess).toEqual('enabled');
    });

    test('review DENIED → sandbox, so a re-apply retries the request', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: false,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'DENIED',
      });
      expect(details.productionAccess).toEqual('sandbox');
    });

    test('review FAILED → sandbox, so a re-apply retries the request', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: false,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'FAILED',
      });
      expect(details.productionAccess).toEqual('sandbox');
    });
  });

  describe('the readonly nuance pass-through', () => {
    test('carries the live flag, enforcement, and review status', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: true,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'GRANTED',
      });
      expect(details.productionAccessEnabled).toEqual(true);
      expect(details.enforcementStatus).toEqual('HEALTHY');
      expect(details.reviewStatus).toEqual('GRANTED');
      expect(details.region).toEqual('us-east-1');
      expect(details.mailType).toEqual('TRANSACTIONAL');
      expect(details.websiteUrl).toEqual('https://ehmpathy.com');
      expect(details.contactLanguage).toEqual('EN');
    });

    test('a null reviewStatus passes through untouched', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        productionAccessEnabled: false,
        enforcementStatus: null,
        reviewStatus: null,
      });
      expect(details.reviewStatus).toEqual(null);
      expect(details.productionAccess).toEqual('sandbox');
    });

    test('a null contactLanguage passes through untouched', () => {
      const details = castIntoDeclaredAwsSesAccountDetails({
        ...withRequest,
        contactLanguage: null,
        productionAccessEnabled: true,
        enforcementStatus: 'HEALTHY',
        reviewStatus: 'GRANTED',
      });
      expect(details.contactLanguage).toEqual(null);
    });
  });

  describe('fail loud on an aws state outside the modeled unions', () => {
    test('a review-status outside the union throws', () => {
      const error = getError(() =>
        castIntoDeclaredAwsSesAccountDetails({
          ...withRequest,
          productionAccessEnabled: false,
          enforcementStatus: 'HEALTHY',
          reviewStatus: 'IN_REVIEW',
        }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('isSesReviewStatus');
    });

    test('a request with no mailType throws', () => {
      const error = getError(() =>
        castIntoDeclaredAwsSesAccountDetails({
          ...withRequest,
          mailType: null,
          productionAccessEnabled: false,
          enforcementStatus: 'HEALTHY',
          reviewStatus: 'PENDING',
        }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('mailType');
    });

    test('a request with an unexpected mailType throws', () => {
      const error = getError(() =>
        castIntoDeclaredAwsSesAccountDetails({
          ...withRequest,
          mailType: 'PROMOTIONAL',
          productionAccessEnabled: false,
          enforcementStatus: 'HEALTHY',
          reviewStatus: 'PENDING',
        }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('mailType');
    });

    test('a request with no websiteUrl throws', () => {
      const error = getError(() =>
        castIntoDeclaredAwsSesAccountDetails({
          ...withRequest,
          websiteUrl: null,
          productionAccessEnabled: false,
          enforcementStatus: 'HEALTHY',
          reviewStatus: 'PENDING',
        }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('websiteUrl');
    });

    test('a request with an unexpected contactLanguage throws', () => {
      const error = getError(() =>
        castIntoDeclaredAwsSesAccountDetails({
          ...withRequest,
          contactLanguage: 'FR',
          productionAccessEnabled: false,
          enforcementStatus: 'HEALTHY',
          reviewStatus: 'PENDING',
        }),
      );
      expect(error).toBeDefined();
      expect(error.message).toContain('contactLanguage');
    });
  });
});
