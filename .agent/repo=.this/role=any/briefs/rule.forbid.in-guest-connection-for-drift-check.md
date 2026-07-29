# rule.forbid.in-guest-connection-for-drift-check

## .what

## severity: blocker

> **a plan-time drift/existence check for a box-hosted resource must NEVER require a live
> connection INTO the managed box (SSH, an SSM `SendCommand`, an agent-dependent probe).**

the check must be answerable from CONTROL-PLANE reads alone — `DescribeInstances`,
`GetParameter`, tags. when the true state lives INSIDE the box (a line in `authorized_keys`, an
installed package, an on-disk config), do NOT reach into the box to read it. instead **bind a
control-plane-readable marker to the instance identity** (the ephemeral instance-id) so that a
REPLACEMENT of the box is detected from metadata, never from a connection into it.

---
---
---

# deets

## .why

declastruct runs the `get` for EVERY declared resource at PLAN time. couple that read to an
in-guest connection and the whole plan inherits the box's fragility:

- **it needs the box reachable, its agent online, its state active.** a stopped box, a terminated
  box, an offline SSM agent, a private box with no NAT egress → the plan stalls or fails. a
  control-plane read works in every one of those states.
- **it needs elevated IAM on the READ path.** an in-guest probe needs `ssm:SendCommand` +
  `ssm:GetCommandInvocation`; a metadata read needs only `ec2:DescribeInstances` /
  `ssm:GetParameter` — grants a read-only caller already holds.
- **it is slow and can hang.** a `SendCommand` + poll is a multi-second round-trip, and an
  agent-not-ready retry loop can stall the plan for minutes per resource.
- **it breaks the plan's promise.** a declarative plan is a fast, reliable, side-effect-free read.
  a command issued into a box is none of those — it is slow, connectivity-dependent, and
  `SendCommand` is a write-like verb on what should be a pure read.

## severity: blocker

an in-guest probe on the read path ships a plan whose reliability is hostage to box connectivity:
it fails on stopped/private/agent-offline boxes, demands IAM a reader should not need, and can hang
the whole apply. the failure is broad (one probe aborts the plan for every downstream resource) and
misattributed (it reads as a broken build, not an unreachable box). no leniency.

## .the technique — bind the marker to the instance identity

1. **record the live instance-id in the tracked marker at `set` time** (e.g. inside the SSM param
   value, beside the fingerprint). the id is already in hand — the `set` looked the instance up to
   act on it.
2. **at `get` time, look up the live instance by its stable exid** (one `DescribeInstances`) and
   **compare the recorded instance-id to the live one.**
3. **match** → the box is the same one the state was applied to → the marker is faithful → return
   the resource (KEEP).
4. **mismatch, or no live instance** → the box was replaced → the in-guest state was wiped → treat
   the marker as absent → `null` → CREATE.
5. **a legacy marker with no recorded instance-id** → unverifiable → treat as absent → `null` →
   a one-time re-apply upgrades it to the new format (benign; `set` is idempotent).

> a raw instance-id string compare is clearer than a hash — the fingerprint already hashes the key;
> the instance-id is a short, debuggable token (`i-0abc…`). a hash adds opacity with no gain.

### why the bind is sound

an instance-id changes ONLY on terminate+recreate (a rebuild), which ALWAYS provisions a fresh root
disk. stop/start and hibernate/resume preserve BOTH the instance-id and the disk. so for the rebuild
path, **"instance-id changed" ⟺ "disk wiped"** — the compare detects exactly the replacement that
invalidates the in-guest state, using only a control-plane read.

## .the accepted tradeoff

the identity bind does NOT catch drift where the box is the SAME (instance-id unchanged) yet the
in-guest state was edited out-of-band — e.g. someone manually removes the key line without a
rebuild. this is DELIBERATELY out of scope: the cost of an in-guest probe on every plan outweighs
the rare same-box out-of-band edit. a re-apply is idempotent, so a manual re-authorize recovers it,
and `set`'s idempotent append means an over-eager re-push is harmless.

## .reconcile with `rule.require.immutable-source-of-truth`

that rule says: read the LIVE source of truth, never a stale self-recorded proxy. this rule does NOT
contradict it — it scopes HOW:

- the instance-id IS a live, control-plane-readable truth.
- the bind does not blindly trust the marker — it VALIDATES the marker against the live instance
  identity. a stale marker (old instance-id) is caught and read as absent.
- so both rules agree: read the live truth — but read it from the CONTROL PLANE, and never from an
  in-guest connection into the box.

## .where

- any `get` / drift check for a resource whose true state lives INSIDE a box: `authorized_keys`,
  installed packages, on-disk config, running services.
- especially `getOneEc2SshKeyAuthorizedByUnique` and its peers.

## .the tell

before a `get`/drift check issues any command, ask:

> "does this read reach INTO the box (SSH / SSM SendCommand), or does it read the CONTROL PLANE
> (DescribeInstances / GetParameter / tags)?"

- reaches into the box → forbidden. bind a control-plane marker to the instance identity instead.
- reads the control plane → allowed.

## .enforcement

- a plan-time `get`/drift check that issues SSH or an SSM `SendCommand` into the box = **blocker**.
- a box-hosted resource whose tracked marker is keyed ONLY by a stable exid (so it survives a
  rebuild) with no instance-identity bind = **blocker** (the stale-proxy trap this rule exists to
  prevent).
- accepting a same-box out-of-band-edit blind spot = **allowed** (documented tradeoff).

## .see also

- `rule.require.immutable-source-of-truth` — read the live truth; this rule scopes it: via the
  control plane, never an in-guest connection.
- `rule.forbid.plan-fail-on-apply-guided-prereq` — a `get` must degrade (`null`/fallback), not
  hard-throw, when a box is unreachable at plan time.
- `rule.require.guaranteed-idempotency` — the idempotent re-push that makes an over-eager CREATE
  (from a false-stale read) harmless.
