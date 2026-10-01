import { getError, given, then, when } from 'test-fns';

import { asS3BucketReadsFulfilled } from './asS3BucketReadsFulfilled';

const asFulfilled = <T>(value: T): PromiseFulfilledResult<T> => ({
  status: 'fulfilled',
  value,
});

const asRejected = (reason: unknown): PromiseRejectedResult => ({
  status: 'rejected',
  reason,
});

/**
 * .what = unit coverage for the unwrap that replaced `Promise.all` on the four bucket-level reads
 * .why = the whole reason this is a named cast rather than a `Promise.all` is its behavior on
 *   MULTIPLE rejections — and that is a case `Promise.all` cannot express, so no integration or
 *   acceptance run against real aws would ever exercise it. a unit test is the only instrument
 *   that can stage two concurrent failures of different causes
 */
describe('asS3BucketReadsFulfilled', () => {
  given('[case1] every read fulfilled', () => {
    when('[t0] the cast unwraps them', () => {
      then('it returns the four values in slot order', () => {
        // ⚠️ slot ORDER is the contract — the caller destructures positionally, so a swap of two
        // slots would hand the lifecycle to the tags variable with no type error to catch it
        // (both are nullable objects). distinct sentinel values are what make a swap visible
        const [publicAccessBlock, versionStatus, lifecycle, tags] =
          asS3BucketReadsFulfilled({
            name: 'a-bucket',
            settled: [
              asFulfilled({ blockPublicAcls: true } as never),
              asFulfilled('Enabled'),
              asFulfilled({ objectExpireDays: 30 } as never),
              asFulfilled({ managedBy: 'declastruct' }),
            ],
          });
        expect(publicAccessBlock).toEqual({ blockPublicAcls: true });
        expect(versionStatus).toEqual('Enabled');
        expect(lifecycle).toEqual({ objectExpireDays: 30 });
        expect(tags).toEqual({ managedBy: 'declastruct' });
      });

      then('an all-null read is fulfilled, not rejected', () => {
        // every one of the four degrades its own absent-signal to `null` internally, so the
        // all-absent bucket is the COMMON fresh-CREATE shape — it must not read as a failure
        expect(
          asS3BucketReadsFulfilled({
            name: 'a-bucket',
            settled: [
              asFulfilled(null),
              asFulfilled(null),
              asFulfilled(null),
              asFulfilled(null),
            ],
          }),
        ).toEqual([null, null, null, null]);
      });
    });
  });

  given('[case2] exactly one read rejected', () => {
    when('[t0] the cast unwraps them', () => {
      then('it rethrows that error UNCHANGED, same class and message', () => {
        // 🔴 the load-bearer of this file. `AccessDenied` must propagate with its class and
        // `.name` intact — an absent iam READ grant that reached the caller as some wrapped
        // aggregate would read as a phantom CREATE (case=6 [t2]). so the single-failure path
        // must stay byte-identical to the sequential form it replaced
        const accessDenied = new Error('User is not authorized to perform ...');
        accessDenied.name = 'AccessDenied';

        const error = getError(() =>
          asS3BucketReadsFulfilled({
            name: 'a-bucket',
            settled: [
              asFulfilled(null),
              asRejected(accessDenied),
              asFulfilled(null),
              asFulfilled(null),
            ],
          }),
        );
        expect(error).toBe(accessDenied);
        expect(error.name).toEqual('AccessDenied');
      });
    });
  });

  given('[case3] two reads rejected for different causes', () => {
    when('[t0] the cast unwraps them', () => {
      then('it aggregates — NEITHER cause is discarded', () => {
        // ⚠️ this is the case `Promise.all` could not express: it surfaces whichever settled
        // first and drops the other, so an operator saw a different cause per run. both causes
        // must survive into one error, and each must name WHICH read produced it
        const denied = new Error('no grant for the block');
        denied.name = 'AccessDenied';
        const broken = new Error('a real defect in the tag read');

        const error = getError(() =>
          asS3BucketReadsFulfilled({
            name: 'a-bucket',
            settled: [
              asRejected(denied),
              asFulfilled(null),
              asFulfilled(null),
              asRejected(broken),
            ],
          }),
        );
        expect(error.message).toContain('2 of 4');
        expect(error.message).toContain('a-bucket');
        // each rejection names its READ, so an operator need not map a slot index by hand
        expect(error.message).toContain('publicAccessBlock');
        expect(error.message).toContain('tags');
        // and each carries its own cause
        expect(error.message).toContain('AccessDenied');
        expect(error.message).toContain('a real defect in the tag read');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });

  given('[case4] every read rejected', () => {
    when('[t0] the cast unwraps them', () => {
      then('it aggregates all four', () => {
        // the upper bound of the aggregate path — a count that hard-coded 2 would pass case3
        const error = getError(() =>
          asS3BucketReadsFulfilled({
            name: 'a-bucket',
            settled: [
              asRejected(new Error('one')),
              asRejected(new Error('two')),
              asRejected(new Error('three')),
              asRejected(new Error('four')),
            ],
          }),
        );
        expect(error.message).toContain('4 of 4');
        expect({ message: error.message }).toMatchSnapshot();
      });
    });
  });
});
