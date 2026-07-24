import { serialize } from 'domain-objects';
import { castToSafeOnDiskCacheKey } from 'simple-on-disk-cache';

/**
 * .what = builds the on-disk cache key for a cost-report read, scoped by
 *         account + region + the report's @unique identity
 * .why = the report's @unique identity is account-agnostic (it is just the query
 *        shape), so a key built from the query alone would serve account A's cached
 *        spend for account B within the ttl — a wrong-tenant read. a key that folds
 *        in the account + region keeps each account's spend in its own cache slot.
 *        one shared builder makes that cross-tenant scope a single INVARIANT rather
 *        than a 3-line convention every future report composite must copy correctly
 * .note = takes only the credentials it needs (account + region), not the full
 *         ContextAwsApi — the composites' `ContextAwsApi & VisualogicContext` fits it
 *         structurally, and the narrow shape keeps the invariant unit-testable
 * .note = `procedure.version` is the cache-invalidation escape hatch: each composite
 *         passes a hardcoded version (e.g. 'v1'). BUMP that version whenever the cast
 *         OUTPUT SHAPE changes (a new/renamed/removed @readonly field), otherwise a
 *         stale cache entry serialized under the old shape can be served for the ttl
 *         window against the new cast. no check enforces the bump — it is a convention
 *         the composite author must follow (low risk given the short ttl, high value
 *         on a breaking shape change)
 */
export const castToCostReportCacheKey = (input: {
  procedure: { name: string; version: string };
  unique: unknown;
  context: { aws: { credentials: { account: string; region: string } } };
}): string =>
  castToSafeOnDiskCacheKey({
    procedure: input.procedure,
    execution: {
      input: serialize({
        account: input.context.aws.credentials.account,
        region: input.context.aws.credentials.region,
        unique: input.unique,
      }),
    },
  });
