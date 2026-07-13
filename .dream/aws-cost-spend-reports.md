# dream: aws-cost-spend-reports

## .what

a read-only "spend report" capability: query actual AWS cost/spend over a time range (e.g.
the past week) via Cost Explorer `GetCostAndUsage`, surfaced as a domain-named report — so we
can observe spend, not just alert/guard on it.

## .why

feat-budget is declarative *control* (declare resources → converge to KEEP). a spend report
is *observability* — a read, not a declared resource. it does not fit the vision's fixed
6-resource set, so it belongs in its own worktree.

## .the ask — a report composite (not a declared resource)

mirror the extant CloudWatch log-group **report composites** in this repo
(`getOneCloudwatchLogGroupReportCostOfIngestion`, `getOneCloudwatchLogGroupReportDistOfPattern`)
— a `getOne…Report` composite that hides a multi-call SDK read behind one clean domain read:

- **`getOneCostAndUsageReport`** — input `{ start, end, granularity: 'DAILY' | 'MONTHLY',
  groupBy?: 'SERVICE' | 'ACCOUNT', filter? }`; calls `ce:GetCostAndUsage` (paginate
  `NextPageToken`), casts the AWS `ResultsByTime` into a tidy domain report
  (`{ periods: [{ start, end, total: { amount, unit }, groups: [...] }] }`)
- reuse the **`getAwsCostExplorerClient`** already built here — it is pinned to us-east-1 and
  carries the enablement-guidance middleware, so an off/not-ready account emits the guided
  `BadRequestError` instead of a cryptic AWS error
- read-only, so a `getOne*` composite with NO `set`/`del` is correct (per
  `rule.forbid.dao-for-narrow-usecase-resource` — a decode-friction composite earns its name)

## .note — data readiness

Cost Explorer data prep takes up to 24h after first enablement, and anomalies need ~10 days
of history before they fire. so early queries may return empty or the "not ready" signal —
the guidance middleware already handles the latter.

## .see also

- `getOneCloudwatchLogGroupReportCostOfIngestion` (this repo) — the report-composite precedent
- `getAwsCostExplorerClient` (this repo) — the client to reuse
- `rule.forbid.dao-for-narrow-usecase-resource` — why a read composite earns its name
