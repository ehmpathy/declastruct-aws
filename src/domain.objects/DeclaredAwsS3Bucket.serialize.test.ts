import { omitReadonly, serialize } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { DeclaredAwsS3Bucket } from './DeclaredAwsS3Bucket';

/**
 * .what = proves the declared backup-store shape survives declastruct's exact KEEP compare —
 *   `serialize(omitReadonly(bucket))` (computeChange.js:checkAreResourcesEquivalent)
 * .why = the KEEP compare is the wish's whole deliverable, and it is driven only against real aws
 *   (plan-time). no local gate exercises serialize on the new nested shape, so a serialize refusal
 *   would surface only in CI. this probes it locally (rule.require.clamp-edge-cases)
 * .note = before every leaf bag (`acls`, `policies`, the three `expire` bags) was declared in its
 *   parent's `static nested`, this threw `DomainObject '…' is not safe to manipulate` — so this
 *   clamp goes RED without the fix and GREEN with it
 */
describe('DeclaredAwsS3Bucket serialize (the KEEP compare path)', () => {
  given('[case1] a declared backup store', () => {
    const inputBackupStore = {
      name: 'declastruct-acceptance-git-backup',
      access: { public: 'blocked' as const },
      lifecycle: {
        objects: { expire: null, transitions: [] },
        versions: {
          status: 'enabled' as const,
          expire: { after: { days: 30 }, keep: null },
        },
        multiparts: { expire: { days: 7 } },
      },
      tags: { managedBy: 'declastruct', purpose: 'git-backup' },
    };

    when('[t0] serialize(omitReadonly(bucket)) runs', () => {
      then('every leaf bag hydrates, so serialize produces a string', () => {
        const serialized = serialize(
          omitReadonly(DeclaredAwsS3Bucket.as(inputBackupStore)),
        );
        expect(typeof serialized).toEqual('string');
      });
    });

    when('[t1] the same input is built and serialized twice', () => {
      then(
        'the two serialize-equal — the KEEP property computeChange decides on',
        () => {
          const serialized = serialize(
            omitReadonly(DeclaredAwsS3Bucket.as(inputBackupStore)),
          );
          const serializedAgain = serialize(
            omitReadonly(DeclaredAwsS3Bucket.as(inputBackupStore)),
          );
          expect(serialized).toEqual(serializedAgain);
        },
      );
    });
  });
});
