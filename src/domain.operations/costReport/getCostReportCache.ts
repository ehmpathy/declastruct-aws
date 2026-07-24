import type { IsoDuration } from 'iso-time';
import * as os from 'os';
import * as path from 'path';
import { createCache, type SimpleOnDiskCache } from 'simple-on-disk-cache';
import type { SimpleCacheAsync } from 'with-simple-cache';

/**
 * .what = the default time-to-live for a cached cost report
 * .why = cost explorer cost data settles over ~24-48h and recommendations move
 *        slowly, so a few-hour ttl is honest — a cached read is not stale within
 *        the window AWS itself has not refreshed
 */
const COST_REPORT_CACHE_TTL: IsoDuration = { hours: 3 };

/**
 * .what = the default on-disk cache directory for cost-report reads — a local dir
 *         under the home dir
 * .why = a per-user local dir is the safe zero-config default; a wisher can override
 *        it (e.g. an s3 target for a shared CI cache) via the `directory` option
 */
const COST_REPORT_CACHE_DIRECTORY_DEFAULT: Parameters<
  typeof createCache
>[0]['directory'] = {
  local: { path: path.join(os.homedir(), '.declastruct', 'cost-reports') },
};

/**
 * .what = the shared on-disk cache for cost-report reads, adapted to the
 *         with-simple-cache SimpleCacheAsync shape; a local dir + 3h ttl
 * .why = each cost explorer read costs money ($0.01/request) and can be slow (the
 *        purchase-plan read runs a two-step async generate); the cache collapses
 *        repeat reads to one billed request per ttl window and serves cached hits
 *        with no round-trip. this factory holds NO module-level singleton — each
 *        call constructs a fresh adapter (like the peer sdk factory
 *        getAwsCostExplorerClient). in practice each getOne composite calls it once
 *        at import time, so there is one long-lived cache instance PER COMPOSITE per
 *        process — not one per read, and not a shared module singleton. the durable
 *        store is the on-disk dir, which is stateless + source-first (see below), so
 *        the per-composite instance is a thin, safe handle onto shared disk
 * .note = the SimpleOnDiskCache get/set options (a `consistency` slot) differ from
 *         with-simple-cache's (a `condition` slot), so this adapter presents exactly
 *         the string-valued async cache the wrapper expects, without a cast
 * .note = the target (local vs s3) + ttl DEFAULT to a local dir + 3h, but are now
 *         overridable via an `options` seam (the first real caller is the integration
 *         test, which points `directory` at a temp dir so it can exercise the real
 *         on-disk adapter without a mock, per rule.forbid.unit.remote-boundaries). a
 *         getOne composite still calls this with no options and gets the DEFAULTS; the
 *         wisher's future s3 target is the same seam
 * .note = CI cost. the default dir is a per-user LOCAL path; CI does not persist it
 *         across runs (the test workflow caches only node_modules), so every CI
 *         acceptance run is a COLD cache and re-bills the full Cost Explorer cost
 *         ($0.01/request, incl. the purchase-plan two-step generate) — the cache
 *         mitigates repeat LOCAL reads, not per-run CI cost. to share a warm cache
 *         across CI runs, point `directory` at an s3 target (the seam above) and add a
 *         cache step; until a wisher opts into that, CI pays full cost each run
 * .note = concurrent-writer safety. two processes (parallel plans, ci) can share the
 *         same on-disk dir. this is safe by three properties, NOT by a lock:
 *         (1) simple-on-disk-cache defaults to `source-first`, so every get reads the
 *             source store — a cross-process overwrite is always seen, never a stale
 *             in-memory value;
 *         (2) the cached value is DETERMINISTIC per @unique key within the ttl (the key
 *             IS the query; the numbers are @readonly), so a last-writer-wins race
 *             writes an equivalent value — no divergence;
 *         (3) a torn/partial write fails LOUD on the consumer's JSON.parse deserialize
 *             (a miss/recompute), never a silent read of corrupt data.
 */
export const getCostReportCache = (options?: {
  directory?: Parameters<typeof createCache>[0]['directory'];
  ttl?: IsoDuration;
}): SimpleCacheAsync<string> => {
  const cache: SimpleOnDiskCache = createCache({
    directory: options?.directory ?? COST_REPORT_CACHE_DIRECTORY_DEFAULT,
    expiration: options?.ttl ?? COST_REPORT_CACHE_TTL,
  });
  return {
    get: (key) => cache.get(key),
    set: (key, value, setOptions) =>
      cache.set(key, value, { expiration: setOptions?.expiration }),
  };
};
