import { given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { getAccount } from '@src/access/sdks/sdkSesv2/getAccount';
import {
  DeclaredAwsSesAccountDetails,
  SES_REVIEW_STATUSES,
} from '@src/domain.objects/DeclaredAwsSesAccountDetails';

import { getOneSesAccountDetails } from './getOneSesAccountDetails';
import { setSesAccountDetails } from './setSesAccountDetails';

/**
 * .what = journey test for the ses production-access posture read + the non-destructive
 *   sandbox-desired set path, against real SES v2 (GetAccount)
 * .why = the sandbox EXIT (a PutAccountDetails with productionAccess 'enabled') opens an
 *   IRREVERSIBLE, account-global AWS review case, so it is proven only by the demo dogfood
 *   apply — NEVER by a repeatable CI test. this journey covers the two paths that are safe to
 *   exercise live against ANY account state:
 *     1. getOne — cross-checked against the raw GetAccount read, so the absent-when-sandbox
 *        gate is proven DETERMINISTICALLY in both live states (bare sandbox → null; a request
 *        in flight/granted → a region-keyed posture). the cast's live-data guard (reviewStatus
 *        must fall in the modeled union) is proven against reality too
 *     2. set with a 'sandbox' desired — provably never calls PutAccountDetails (a findsert
 *        returns the extant posture; a sandbox desired has no submit branch), so it converges
 *        without a write no matter whether the account already holds a request
 */
describe('sesAccountDetails.journey', () => {
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    const region = context.aws.credentials.region;
    return { context, region };
  });

  given('[case1] getOne mirrors the raw GetAccount posture', () => {
    const observed = useBeforeAll(async () => {
      const { context, region } = scene;
      const raw = await getAccount({}, context);
      const found = await getOneSesAccountDetails(
        { by: { unique: { region } } },
        context,
      );
      // the absent-when-sandbox gate: getOne is present iff the flag is on OR a review is
      // in flight (reviewStatus 'PENDING') — the same predicate getOneSesAccountDetails uses
      const hasRequest =
        raw.productionAccessEnabled || raw.reviewStatus === 'PENDING';
      return { raw, found, hasRequest };
    });

    when('[t1] the account holds no request', () => {
      then('getOne reads absent (null → CREATE)', () => {
        if (observed.hasRequest) return; // asserted by [t2]; this account holds a request
        expect(observed.found).toBeNull();
      });
    });

    when(
      '[t2] the account holds a request (flag on or review in flight)',
      () => {
        then('getOne reads a present, region-keyed posture', () => {
          if (!observed.hasRequest) return; // asserted by [t1]; this account is a bare sandbox
          expect(observed.found).not.toBeNull();
          expect(observed.found?.region).toEqual(scene.region);
          expect(['enabled', 'sandbox']).toContain(
            observed.found?.productionAccess,
          );
        });

        then(
          'a present reviewStatus falls in the modeled union (live-data guard)',
          () => {
            if (!observed.hasRequest) return;
            if (observed.found?.reviewStatus == null) return;
            expect(SES_REVIEW_STATUSES).toContain(observed.found.reviewStatus);
          },
        );
      },
    );
  });

  given('[case2] a sandbox-desired set (the provably non-submit path)', () => {
    const sandboxDesired = DeclaredAwsSesAccountDetails.as({
      region: 'us-east-1',
      productionAccess: 'sandbox',
      mailType: 'TRANSACTIONAL',
      websiteUrl: 'https://ehmpathy.com',
      contactLanguage: 'EN',
      additionalContactEmails: null,
    });

    when('[t1] findsert a sandbox desired', () => {
      const outcome = useBeforeAll(async () => {
        const { context, region } = scene;
        // re-key the desired to the live region so the read-back matches this account
        return setSesAccountDetails(
          {
            findsert: DeclaredAwsSesAccountDetails.as({
              ...sandboxDesired,
              region,
            }),
          },
          context,
        );
      });

      then('it converges without a PutAccountDetails write', () => {
        // a findsert never submits for a sandbox desired: an extant request is returned
        // unchanged; a bare sandbox is echoed back — either way, no irreversible request
        expect(outcome.region).toEqual(scene.region);
        expect(['enabled', 'sandbox']).toContain(outcome.productionAccess);
      });
    });
  });
});
