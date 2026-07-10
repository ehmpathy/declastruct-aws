# rule.require.immutable-source-of-truth

## .what

## severity: blocker

every attribute we compare for drift — especially an IMMUTABLE one — must be read from
the resource's LIVE source of truth whenever that truth is readable. a value we recorded
ourselves (a tag, a cache file, an SSM param, a hashed marker) may serve ONLY as a
fallback for the window where the live truth is genuinely unreadable. it must never
stand in for a readable live value.

if the live truth is readable, read it. only when it is unreadable may you fall back to a
recorded value — and even then, prefer to flag the attribute as un-verifiable rather than
silently trust the record.

---
---
---

# deets

## .what

a "recorded value" is anything WE wrote to describe the resource's intended state: an
`exid`/`templateExid`/`publicIpEnabled` tag, a param-store entry, a cache file, an
idempotency hash. these are useful — they let a stopped/paused resource still declare what
it WAS meant to be. but they are our own claim, not the provider's truth.

the provider's LIVE state is the source of truth. drift detection exists to catch when the
live state diverges from what we declared — including when someone edits the resource
**out of band** (console click, aws cli, another tool, a teammate). if we compare against
our own recorded claim instead of the live truth, an out-of-band edit is invisible: the
plan reports KEEP while reality has drifted, and we have silently lost control of the
resource.

## .why

reading the source of truth is what makes declarative control real:

- **catch out-of-band drift** — a live read surfaces the divergence; a re-apply can then
  reconcile it (regain control) or, for a truly immutable attribute, fail loud so a human
  knows a terminate+recreate is required (flag as can't-change).
- **never get lied to by a stale record** — a tag says `publicIpEnabled=true`, but someone
  detached the public ip out of band. if we trust the tag we report KEEP and the box is
  quietly broken. if we read the live value we catch it.
- **a recorded value is a fallback, not a truth** — it is only trustworthy for the exact
  window where the live value is unreadable (e.g. a stopped instance whose auto-assigned
  public ip AWS has released). the moment the live value is readable again, it wins.

this is the ownership-aware sibling of `rule.require.guaranteed-idempotency`: idempotency
says a re-run must converge to desired; this rule says the drift check that drives that
convergence must be grounded in the live truth, or convergence is a lie.

## severity: blocker

trusting a recorded value over a readable live value is a rabid failhide: the plan is
green, the resource has drifted, and no one knows until the box misbehaves in production.
it defeats the entire point of a declarative provisioner. no leniency.

## .the rule

for any attribute that feeds drift detection:

1. **read the live source of truth first** whenever it is readable (e.g. the instance is
   RUNNING, the resource is in a state where the provider returns the real value).
2. **fall back to a recorded value ONLY** when the live truth is genuinely unreadable, and
   scope that fallback narrowly to exactly that window.
3. **never let a recorded value override a readable live value** — the live value wins on
   every path where it exists.
4. for a truly immutable attribute, a caught divergence must **fail loud** (recreate
   required), not be reconciled away or masked.

## .the worked example — `publicIpEnabled`

AWS releases an auto-assigned public ip when an instance stops, so `PublicIpAddress` is
readable only while the instance is RUNNING. therefore:

| instance state | source used | why |
|----------------|-------------|-----|
| running | live `PublicIpAddress` | authoritative — catches out-of-band detach |
| not running | `publicIpEnabled` intent tag (fallback) | live value unreadable; tag is our recorded intent, stable across stop/start |
| not running, no tag (legacy) | best-effort live value | no better value to read |

so a running NAT whose public ip was removed out of band reads `publicIpEnabled=false`
from the LIVE value (not the stale `tag=true`) — the drift is caught, and the immutable
classifier flags it for recreate. the tag only speaks when the box is stopped and the
truth is silent.

see `castIntoDeclaredAwsEc2Instance` and `getEc2InstanceImmutableDrift`.

## .the test

before you compare an attribute for drift, ask:

> "is the provider's live value for this readable right now? if yes, am i reading THAT —
> or am i reading something i recorded earlier?"

- reading the live value → correct.
- reading a recorded tag/cache while the live value is readable → this rule is violated;
  an out-of-band edit will be masked.

## .where

- every `cast*` / `get*` that produces a domain object fed into a plan/drift comparison
- especially immutable-attribute reads in the EC2 / VPC families (public-ip association,
  subnet, template, security groups, route targets)
- any idempotency check that could tolerate a conflict based on a self-recorded marker

## .enforcement

- a recorded value (tag, cache, param, hash) used as the PRIMARY drift signal when the
  live provider value is readable = blocker
- a fallback-to-record path not scoped to the unreadable window = blocker
- an immutable divergence silently reconciled or masked instead of failed-loud = blocker

## .see also

- `rule.require.guaranteed-idempotency` — convergence must be proven against the live
  state, not assumed from a conflict or a marker
- `rule.forbid.silent-resource-theft` — the ownership-gate sibling: never overrule a live
  foreign claim based on a partial-key inference
- `rule.forbid.test-blocking-orphans` — an immutable divergence that this rule surfaces is
  reconciled by prune-then-recreate, not by masking
