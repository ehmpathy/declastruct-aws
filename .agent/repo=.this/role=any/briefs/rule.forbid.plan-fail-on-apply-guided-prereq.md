# rule.forbid.plan-fail-on-apply-guided-prereq

## severity: blocker

## .what

> **a `get` (plan-time read) must NEVER hard-throw on an unmet precondition that the
> resource's own `set` (apply-time write) is designed to guide or fix.**

that one line is the whole rule. when a precondition is off — a console-only opt-in, an
absent grant, an un-provisioned dependency — and the resource models that precondition as a
declarable state whose `set` FAILS LOUD WITH GUIDANCE (or fixes it), then the `get` must
DEGRADE (a report → empty; a precondition probe → `null` = "absent → CREATE"), NOT throw. the
throw belongs on the `set` (apply), where declastruct can surface the actionable guidance —
not on the `get` (plan), where a throw aborts the whole plan before the human ever sees it.

---
---
---

# deets

## .why

declastruct runs `get` for EVERY declared resource at PLAN time to compute CREATE/KEEP/UPDATE.
a single `get` that throws aborts the ENTIRE plan — every downstream resource, every report,
every KEEP — before declastruct can render a diff. so a plan-time throw is a blast-radius
failure: one off precondition takes down the whole wish.

the graceful, declarative path already exists for exactly this case:

- the precondition is its OWN declared resource (e.g. `DeclaredAwsCostExplorerPreference`),
  whose `get` PROBES enablement (present = enabled → KEEP; `null` = off → CREATE) and whose
  `set.findsert` FAILS LOUD with console guidance (AWS exposes no api to flip the opt-in, so
  the human does it by hand — and apply is where declastruct tells them how).
- a dependent read (e.g. a per-resource cost report) DEGRADES to an empty read + a LOUD warn
  that points at the declared precondition, so plan stays green and the report simply reads
  empty until the opt-in is on.

both paths route the ACTIONABLE failure to APPLY (or to a warn), never to a plan-time throw.
a `get` that throws on the off-signal SKIPS this whole design: the plan dies, the human sees a
raw SDK stack trace, and the carefully written `set.findsert` guidance is never reached.

## severity: blocker

a plan-time throw on an apply-guided prereq ships a defect that LOOKS like a hard error but is
really a missed graceful path: the human is told "plan failed" with a cryptic
`AccessDenied`/`DataUnavailable` stack instead of "declare this precondition + flip this
console switch". debug costs real time (it reads as a broken build, not an absent opt-in), and
it defeats the entire point of a precondition modeled as a guided declarable resource. no
leniency.

## .the repeat root cause — verify the aws signal, do not assume it

this defect hit TWICE, both times from the SAME mistake: an ASSUMPTION of which aws error
signals "prereq off" instead of a check against the live api.

- the resource-level data opt-in was assumed to signal off via `DataUnavailableException`
  (by NAME). the LIVE api actually throws `AccessDeniedException` whose MESSAGE names the
  condition ("resource-level data granularity ... opt-in only feature ... Cost Explorer
  Settings page") — the SAME message-signal shape as the rightsize opt-in.
- because the detector matched the assumed name, it MISSED the real signal, the `get`
  else-branch rethrew, and the plan died — exactly the failure this rule forbids.

so this rule has a companion discipline: **the off-signal detector must match the REAL aws
error (verified live), and the `get` must route ONLY unknown errors to a throw.** a detector
built on an unverified assumption both mislabels the real signal AND, when it misses, drops
you into the forbidden plan-time throw.

## .the shape to follow

### the precondition resource (its `get` degrades, its `set` guides)

```ts
// get: PROBE — present = enabled (KEEP); the off-signal = null (absent → CREATE); only an
// UNKNOWN error throws (a real iam denial, a network fault) — never the known off-signal
get: { one: { byUnique: async (ref, ctx) => {
  try { await probe(); return Preference.as(ref); }        // enabled
  catch (e) {
    if (isOptInDisabledError({ error: e })) return null;    // off → CREATE, NOT a throw
    throw wrap(e);                                          // unknown → throw
  }
}}},

// set: the APPLY path is where the actionable guidance lives
set: { findsert: async (input) => { throw getGuidanceError({ feature: input.feature }); },
       upsert: null, delete: null },
```

### the dependent read (degrades to empty + warns, never a plan-abort throw)

```ts
try { /* the billed read */ }
catch (error) {
  if (isOptInDisabledError({ error })) {
    ctx.log.warn('opt-in off → empty report; provision DeclaredAwsX + enable it', { ... });
    return castEmpty();                                     // degrade, NOT a throw
  }
  throw wrap(error);                                        // unknown → throw
}
```

## .the tell

before a `get`/probe throws on any caught error, ask:

> "is this the KNOWN 'prereq off' signal — and does this resource's `set` (or a declared
> precondition's `set`) guide the human to fix it?"

- YES (known off-signal + a guided `set` exists) → DEGRADE (`null` / empty + warn). the plan
  stays green; the guidance surfaces at apply.
- NO (a genuinely unknown error) → throw. an unknown error at plan is a real failure.

## .where

- any DAO `get` / precondition probe whose failure mode is a console-only opt-in, an absent
  grant, or an un-provisioned dependency that a `set` (its own or a declared precondition's)
  is designed to guide or fix
- especially: the Cost Explorer preference probes + every report `get` that depends on them
  (`getOneCostReportSpendObservedByResource`, the rightsize + forecast reads)

## .enforcement

- a `get`/probe that throws on a KNOWN apply-guided off-signal = blocker (degrade instead)
- an off-signal detector built on an UNVERIFIED aws error shape = blocker (verify live first)
- a dependent read that aborts the plan instead of an empty-degrade + loud warn = blocker
- a real UNKNOWN error swallowed instead of thrown = blocker (that is the opposite failhide)

## .see also

- `rule.forbid.failhide` (mechanic) — the inverse guard: do NOT swallow an UNKNOWN error; this
  rule degrades ONLY on the precise, verified off-signal and throws every other error
- `rule.require.dao-and-acceptance-per-declared-resource` — the precondition is its own
  declared resource, so its `set` is the drivable place the guidance lives
- `rule.require.declarative-in-skills-and-contracts` — the guided `set` is the declarative
  answer to "how do i turn this on", not an imperative side-channel
