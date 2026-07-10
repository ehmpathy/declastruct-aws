# howto.unblock-resource-contention

## .what

when two declarations contend for the same AWS resource slot in the demo account (e.g.
a subnet's `(vpc, cidr)`, a route-table association's `subnet-id`), a set op now fails
loud instead of a silent steal of the resource (see `rule.forbid.silent-resource-theft`).
this howto covers how to get unblocked — near-term and long-term.

## .why

a fail-loud on contention is correct (it prevents silent theft), but it leaves the apply
stuck until the contention is settled. there are two horizons:

- **near-term** — get the current apply green again: prune the resource that holds the slot.
- **long-term** — remove the *reason* two declarations want the same slot, so the
  contention cannot recur.

both matter. cleanup alone treats the symptom; if the root cause stays, the next run
contends again.

## .near-term: cleanup (prune the orphan)

when contention blocks an apply, prune the extant resource that holds the slot, then
re-apply. a fresh apply recreates it clean under the correct owner.

this mirrors the extant EC2 prune pattern:

```sh
# EC2 orphan (instance + launch template)
./provision/aws.infra/account=demo/aws.prune.ec2.sh

# explicit stale fixtures
./provision/aws.infra/account=demo/aws.prune.ec2.sh \
  --instance declastruct-acceptance-instance \
  --template declastruct-acceptance-template
```

the prune calls the idempotent `del*` operations (a no-op if the orphan is already
absent). the same shape extends to VPC contention — prune the stuck subnet / route
table, then re-apply.

**always prune via the paired `.sh` wrapper** (it unlocks keyrack + sources the demo
profile); never run the `.ts` bare — see `feedback_never-run-ts-directly`.

### when near-term cleanup is enough

- a genuine **orphan** from a prior partial run (unowned, no live dependency)
- a **stale fixture** whose declaration altered an immutable attribute

### when near-term cleanup is NOT enough

- the slot is held by a **live, foreign-owned** resource (another active declaration).
  do NOT prune someone else's live resource to unblock yourself — that is the same theft
  the fail-loud prevents, just done by hand. settle ownership first (below).

## .long-term: eliminate the collision at root

cleanup is a treadmill if two declarations keep demand for the same slot. the durable fix
is to make the slots **not overlap** so contention is structurally impossible:

- **distinct natural keys per declaration domain** — give demo-provision resources and
  acceptance-fixture resources non-overlapped identities. the sharpest example: the demo
  VPC (`declastruct-demo-*`) and the acceptance VPC (`declastruct-acceptance-*`) both
  declare `10.0.0.0/16` / subnet `10.0.1.0/24` in the SAME account. distinct, non-overlapped
  CIDR ranges (e.g. demo `10.0.0.0/16`, acceptance `10.10.0.0/16`) mean their subnets can
  never contend for a `(vpc, cidr)` slot, even if a VPC boundary ever blurs.
- **single owner per slot** — if two declarations legitimately need the SAME resource,
  they should not both create it; one owns it, the other references it by ref.

> note: a change to an immutable attribute (a subnet's cidr, a launch template's config) on
> an already-deployed resource orphans the extant one — prune it FIRST, then apply the new
> identity, per `rule.forbid.test-blocking-orphans`. so a long-term CIDR re-range is itself
> a prune-then-apply, not an in-place edit.

## .the sequence

1. **unblock now** — prune the orphan/stale fixture via the `.sh` wrapper, re-apply.
2. **then fix root** — if the contention was structural (two declarations, same slot),
   re-range the identities so they no longer overlap; do it as prune-then-apply.
3. **never** prune a live, foreign-owned resource just to pass — settle ownership.

## .see also

- `rule.forbid.silent-resource-theft` — why the set op fails loud on a foreign claim
  instead of a steal of the slot (the reason you land here).
- `rule.forbid.test-blocking-orphans` — the orphan lifecycle that produces contention, and
  why immutable-attribute changes must prune first.
- `rule.require.guaranteed-idempotency` — the partial-key vs full-identity distinction that
  underlies why a subnet/association conflict is not automatically "yours".
- `feedback_never-run-ts-directly` — always prune via the `.sh` wrapper.
