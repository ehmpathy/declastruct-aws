import { getError, given, then, when } from 'test-fns';

import {
  AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD,
  asAwsS3BucketVersionStatus,
  asHouseS3BucketVersionStatus,
  type HouseS3BucketVersionStatus,
  isAwsS3BucketVersionStatus,
} from './isAwsS3BucketVersionStatus';

/**
 * .what = unit coverage for the aws version-state value guard (I-5, case=4)
 * .why = the one boundary that fails loud on an aws value outside the modeled set, so an unknown
 *   status is distinguishable from an absent read — its reject path owes a clamp
 *   (rule.require.clamp-edge-cases)
 */
describe('isAwsS3BucketVersionStatus', () => {
  given('[case1] a set of candidate wire values', () => {
    const CASES = [
      { description: 'Enabled passes', value: 'Enabled', ok: true },
      { description: 'Suspended passes', value: 'Suspended', ok: true },
      { description: 'a lowercase enabled fails', value: 'enabled', ok: false },
      {
        description: 'an unmodeled value fails',
        value: 'MfaDelete',
        ok: false,
      },
      { description: 'empty string fails', value: '', ok: false },
    ];

    when('[t0] each is assessed', () => {
      CASES.forEach((thisCase) =>
        then(thisCase.description, () => {
          expect(isAwsS3BucketVersionStatus.assess(thisCase.value)).toEqual(
            thisCase.ok,
          );
        }),
      );
    });
  });

  given('[case2] a modeled and an unmodeled wire value', () => {
    when('[t0] the modeled value is assured', () => {
      then('it returns unchanged', () => {
        expect(isAwsS3BucketVersionStatus.assure('Enabled')).toEqual('Enabled');
      });
    });

    when('[t1] the unmodeled value is assured', () => {
      then('it throws loud', () => {
        const error = getError(() =>
          isAwsS3BucketVersionStatus.assure('MfaDelete'),
        );
        expect(error.message).toContain('isAwsS3BucketVersionStatus');
      });
    });
  });

  given('[case3] the one-source house-word ↔ wire-value record', () => {
    // 🔴 the clamp on the one-source map. the write side and the read side were two ad-hoc forms —
    // an inline `as const` and a ternary — with the correspondence declared in neither
    const HOUSE_WORDS: HouseS3BucketVersionStatus[] = ['enabled', 'suspended'];

    when('[t0] the hand-written list is compared to the record', () => {
      then('the list under test covers every key the record declares', () => {
        // ⚠️ `Object.keys` cannot be typed without a cast, so the list above is hand-written — and
        // this clamp keeps it honest. a house word added to the record fails HERE, loudly
        expect([...HOUSE_WORDS].sort()).toEqual(
          Object.keys(AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD).sort(),
        );
      });
    });

    when('[t1] each house word is mapped through both directions', () => {
      then('every house word round-trips unchanged', () => {
        HOUSE_WORDS.forEach((house) =>
          expect(
            asHouseS3BucketVersionStatus(asAwsS3BucketVersionStatus(house)),
          ).toEqual(house),
        );
      });

      then(
        'the write direction emits exactly the wire value the record declares',
        () => {
          HOUSE_WORDS.forEach((house) =>
            expect(asAwsS3BucketVersionStatus(house)).toEqual(
              AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD[house],
            ),
          );
        },
      );

      then('every wire value the guard accepts has a house word', () => {
        // ⚠️ the inverse must be TOTAL over the guard's accepted set. a wire value the guard admits
        // but the inverse cannot map is exactly the drift one shared record exists to make impossible
        HOUSE_WORDS.map(
          (house) => AWS_S3_BUCKET_VERSION_STATUS_BY_HOUSE_WORD[house],
        ).forEach((wire) => {
          expect(isAwsS3BucketVersionStatus.assess(wire)).toEqual(true);
          expect(HOUSE_WORDS).toContain(asHouseS3BucketVersionStatus(wire));
        });
      });
    });
  });
});
