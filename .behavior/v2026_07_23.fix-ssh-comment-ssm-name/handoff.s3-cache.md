# handoff.s3-cache — global s3 cost-report cache to prevent quota-exceeded plan aborts

## .what

thread a **global (s3-backed) cost-report cache** from the provider definition down
into each cost-report `getOne*` operation, so CI runs share a warm cache instead of a
cold per-run local one — to prevent the AWS Cost Explorer **daily-quota** abort that
currently breaks the acceptance suite.

## .why (the incident)

`declastruct plan` reads every declared resource's `get` at plan time. the
`DeclaredAwsCostReportRecommendationsToPurchasePlan` read calls
`GetSavingsPlansPurchaseRecommendation`, which has a hard AWS **daily quota**. on a cold
CI cache the read hits live AWS every run and, once the quota is spent, throws:

```
ServiceQuotaExceededException: You have exceeded your daily limit. Try again the next day.
  at src/domain.operations/costReportRecommendationsToPurchasePlan/getOneCostReportRecommendationsToPurchasePlan.ts:170
```

because it is a plan-time `get`, the throw aborts the ENTIRE plan and cascades every
plan/apply/KEEP acceptance assertion to red (observed on ehmpathy/declastruct-aws#73's
release run). the rightsize recommendation report has the same-family problem (live-data
variance → empty `recommendations: []` → snapshot mismatch).

as an immediate unblock, the two recommendation reports were removed from the acceptance
declared-set + their DAO-read assertions (see the "restore" note below). this task is the
durable fix that lets them come back.

## .the seam already exists

`getCostReportCache({ directory, ttl })`
(`src/domain.operations/costReport/getCostReportCache.ts`) already accepts a `directory`
option and documents an s3 target for a shared CI cache — `simple-on-disk-cache` supports
s3 directories. its `.note` blocks call out exactly this CI-cold-cache cost. the absent
piece is **the plumb-through**: today each cost-report op calls `getCostReportCache()`
with NO options at **import time** (the module-level `withSimpleCacheAsync` wrapper), so
the provider config cannot reach it.

## .the work

1. **provider input** — extend `getDeclastructAwsProvider` `input.cache` (peer of the
   extant `DeclaredAwsSsmVpcTunnel` / `DeclaredAwsSsmSshTunnel` process-dir seams) with a
   `costReports?: { directory?; ttl? }` config, and thread it into
   `providerContext.aws.cache.costReports`.
2. **context down to the op** — move each cost-report op's `getCostReportCache(...)` call
   from import-time to call-time so it reads `context.aws.cache.costReports.directory`
   (fallback to the current local default). affects all five reports: SpendObserved,
   SpendObservedByResource, SpendForecast, RecommendationsToRightsize,
   RecommendationsToPurchasePlan.
3. **s3 target** — allow the `directory` to be an s3 target (bucket + key prefix), keyed
   the same way the on-disk one is (account + region + @unique query); confirm the
   source-first + deterministic-value concurrent-writer safety still holds for s3.
4. **CI seam** — point the acceptance workflow's provider config at the shared s3 cache
   (a dedicated demo-account bucket) + grant the ssm/ce read the bucket get/put in
   `demoPermissionsPolicy` if needed. re-apply BOTH demo roles (SSO + OIDC) per
   hazard.local-green-cicd-red.
5. **restore the acceptance coverage** — re-add the two recommendation reports to the
   acceptance declared-set + their DAO-read + KEEP assertions once the warm cache makes
   them quota-safe. this satisfies rule.require.dao-and-acceptance-per-declared-resource
   again.

## .acceptance

- a CI acceptance run reads each cost-report from the shared s3 cache on a warm hit — no
  live Cost Explorer call, no quota burn
- the purchase-plan + rightsize recommendation reports are back in the acceptance
  declared-set and pass (plan-inclusion + KEEP)
- a cold first run still works (populates the cache); subsequent runs are warm
- concurrent CI runs that share the s3 dir stay safe (source-first + deterministic value)

## .note — consider plan-time degrade too

separately, per `rule.forbid.plan-fail-on-apply-guided-prereq`, a plan-time `get` that
hits a transient throttle arguably should DEGRADE (empty report + loud warn) rather than
hard-throw and abort the whole plan. worth a pair with the cache fix so a quota blip
never again takes down an unrelated plan. (own judgment call for the implementer.)

## .env

- surfaced on ehmpathy/declastruct-aws#73's prod-release CI run (test-acceptance-locally)
- op: `src/domain.operations/costReportRecommendationsToPurchasePlan/getOneCostReportRecommendationsToPurchasePlan.ts`
- cache: `src/domain.operations/costReport/getCostReportCache.ts`
- provider: `src/domain.operations/provider/getDeclastructAwsProvider.ts`
