# rule.forbid.silent-resource-theft

## .what

## severity: blocker

a set operation must NEVER silently seize a resource that is already owned by a
different claim. if a pre-extant resource carries an ownership marker (e.g. an `exid`
tag) that differs from the caller's, the operation must **fail loud** and force
disambiguation — it may not overrule, retag, or redirect the resource out from under
its current owner.

adoption of a pre-extant resource is safe ONLY when the resource is **unowned** (no
claim) or **already ours** (the claim matches). a foreign claim is a hard stop.

---
---
---

# deets

## .what

many AWS resources have a natural key that is a **subset** of their identity — a subnet
is keyed by `(vpc, cidr)`, a route-table association by `subnet-id`. two independent
declarations can collide on that partial key while carrying different ownership markers
(different `exid` tags). when a set op settles the collision by **retag / reassociate /
overrule**, it silently transfers the resource from owner A to owner B.

this brief forbids that. the moment a set op sees a foreign claim on the slot it wants,
it must stop and surface the conflict to a human, not settle it by theft.

## .why

silent theft is a rabid failhide with a large blast radius:

- **it corrupts two declarations at once** — B steals A's subnet; A's next plan reads
  "not found → CREATE", collides again, retags it back; the two ping-pong forever, and
  neither converges. the system looks idempotent per-run and is chaotic across runs.
- **route/association theft misroutes live traffic** — moving a subnet onto a different
  route table silently changes where that subnet's packets go (or black-holes them). the
  operation reports success while production traffic is redirected.
- **it hides a real human decision** — a partial-key collision with a foreign owner is
  almost always a mistake (two teams picked the same cidr) or an intentional handoff
  (delete-then-recreate). either way a human must decide; code cannot infer intent from a
  tag it is about to overwrite.

this is the ownership-aware corollary of `rule.require.guaranteed-idempotency`: a
conflict tells you the slot is occupied, NOT that the occupant is yours. inferring
"occupied ⇒ mine" is the theft.

## severity: blocker

a silent steal ships a defect that looks like success: the apply is green, the resource
is reassigned, and the victim declaration is now non-convergent. debugging costs hours
(the ping-pong looks like flake, not theft) and, for routing resources, can cause a live
outage. there is no leniency — a set op that can overrule a foreign claim is a blocker.

## .the ownership gate

before a set op adopts / retags / reassociates any pre-extant resource, it MUST classify
the current claim:

| current claim | verdict |
|---------------|---------|
| **unowned** — no ownership marker (genuine orphan) | ✅ adopt (tag it, reuse it) |
| **ours** — marker equals the caller's `exid` | ✅ no-op (it is already us) |
| **foreign** — marker differs from the caller's `exid` | ⛔ **fail loud** — never overrule |

the foreign case throws a caller-actionable error that names the conflict and the
options, e.g.:

```
ConstraintError: a subnet already holds 10.0.1.0/24 in vpc-abc, owned by exid="team-a-subnet".
  it cannot be adopted for exid="team-b-subnet".
  fix by one of:
    - delete the extant subnet, then re-apply
    - reconcile the two declarations to a single exid
    - choose a non-conflicting cidr
```

## .where

- any set op that settles a create/associate conflict by inspection of a pre-extant
  resource and tagging / re-pointing it — especially the VPC family:
  - `setVpcSubnet` (adopt-on-`InvalidSubnet.Conflict`)
  - `setVpcRouteTableAssociations` (move-subnet-off-another-table)
  - route / internet-gateway / association set ops with subset natural keys
- generally: any `set*` where the conflict key is a **subset** of the desired identity
  (see the idempotency brief's key⊂identity table).

## .how

1. on conflict, read the extant resource AND its ownership marker.
2. classify per the ownership-gate table above.
3. `unowned` → adopt; `ours` → no-op; `foreign` → throw a `ConstraintError` (exit 2,
   caller must fix) that names the owner and the disambiguation options.
4. for a same-declaration move (associate subnet X currently on an **unowned/ours**
   table), the move is still allowed — the gate blocks only theft from a **foreign**
   owner, not legitimate reconciliation within your own claim.

## .the test

before you retag / reassociate / overrule a pre-extant resource, ask:

> "does this resource already carry someone else's claim?"

- **no** (unowned or ours) → safe to proceed.
- **yes** (foreign claim) → you are about to steal it. stop and fail loud instead.

## .enforcement

- a set op that overwrites / re-points a resource carrying a **foreign** ownership marker
  = blocker
- adoption keyed on a partial natural key **without** an ownership check = blocker
- tolerating a partial-key conflict as "mine" without verify of the claim = blocker
  (this is the failhide from `rule.require.guaranteed-idempotency`)

## .see also

- `rule.require.guaranteed-idempotency` — a conflict's key covers only part of the
  identity; inferring "occupied ⇒ desired" is the same failhide this rule names for
  ownership.
- `rule.forbid.test-blocking-orphans` — the orphan lifecycle that produces these
  partial-key collisions in the first place.
