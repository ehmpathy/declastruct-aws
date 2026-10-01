import { serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { asCanonicalS3BucketPublicAccess } from './asCanonicalS3BucketPublicAccess';

/**
 * .what = unit coverage for the public-access canonicalizer
 * .why = the `'blocked'` token and a typed-out four-boolean literal must collapse to the SAME
 *   object, or a caller who writes `'blocked'` never serialize-equals a bucket read back as four
 *   explicit booleans → UPDATE forever (the permadrift this wish closes, F14/F15). the cast test
 *   exercises the read-back path; this pins the TOKEN-expansion arm the cast never passes
 */
describe('asCanonicalS3BucketPublicAccess', () => {
  given("[case1] the 'blocked' token", () => {
    when('[t0] it is canonicalized', () => {
      then('it expands to all four controls on (F15)', () => {
        const canonical = asCanonicalS3BucketPublicAccess('blocked');
        expect(canonical.acls).toEqual({ block: true, ignore: true });
        expect(canonical.policies).toEqual({ block: true, restrict: true });
      });
    });
  });

  given('[case2] an explicit mixed four-boolean object', () => {
    when('[t0] it is canonicalized', () => {
      then('it passes through with each control preserved', () => {
        const canonical = asCanonicalS3BucketPublicAccess({
          acls: { block: true, ignore: false },
          policies: { block: false, restrict: true },
        });
        expect(canonical.acls).toEqual({ block: true, ignore: false });
        expect(canonical.policies).toEqual({ block: false, restrict: true });
      });
    });
  });

  given("[case3] the 'blocked' token and its typed-out all-true equal", () => {
    when('[t0] both are canonicalized and serialized', () => {
      then('they serialize-equal (the KEEP property)', () => {
        const fromToken = asCanonicalS3BucketPublicAccess('blocked');
        const fromLiteral = asCanonicalS3BucketPublicAccess({
          acls: { block: true, ignore: true },
          policies: { block: true, restrict: true },
        });
        // declastruct decides KEEP via serialize(desired) === serialize(remote); this is that compare
        expect(serialize(fromToken)).toEqual(serialize(fromLiteral));
      });
    });
  });
});
