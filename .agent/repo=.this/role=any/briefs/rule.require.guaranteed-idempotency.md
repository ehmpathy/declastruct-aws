# rule.require.guaranteed-idempotency

## .what

every set operation must be idempotent by **guarantee**, never by **assumption**.

a re-run must leave the resource in exactly the desired state — proven by a post-condition
(converge or verify), not inferred from a conflict error.

**assumed idempotency is a failhide.** when you swallow an "already extant" conflict and
report success, you assert the extant resource equals the desired resource. if the conflict
key covers only part of the identity, that assertion can be false — and you have hidden a
real divergence behind a green result. that is a rabid failhide: it looks idempotent, it
passes tests, and it silently ships the wrong state.

## .why

a conflict error tells you the slot is **occupied**. it does NOT tell you the slot holds
**exactly what you asked for**. a tolerate of the conflict infers equivalence; it does not
prove it.

the inference is safe only when the conflict's uniqueness key covers the FULL desired
identity. where the key is a SUBSET of the identity, the extant child can differ from
desired along the un-keyed dimension, and a tolerate reports a false success.

concrete lesson from this repo (VPC set ops):

| operation | conflict keys on | full desired identity | tolerate safe? |
|-----------|------------------|-----------------------|----------------|
| AuthorizeSecurityGroup* | the entire rule tuple (protocol + ports + cidr/source) | the whole rule | ✅ key == identity |
| CreateRoute | destination cidr | destination cidr **+ target gateway** | ❌ key ⊂ identity |
| AttachInternetGateway | the gateway | gateway **+ which vpc** | ❌ key ⊂ identity |
| AssociateRouteTable | the subnet | subnet **+ which route table** | ❌ key ⊂ identity |

the two ❌ route/gateway sites originally tolerated their conflict — a latent failhide that
would report success while a route pointed at the wrong gateway or an igw hung off the wrong
vpc. they were fixed to converge/verify.

## .the rule

to make a set operation idempotent, use one of these — in preference order:

1. **findsert on a natural key** — look up by the full unique key first; create only if absent.
   the lookup covers the whole identity, so no conflict inference is needed.
2. **converge** — issue the mutation that sets the desired state regardless of current state
   (e.g. `ReplaceRoute` in place of a tolerated `CreateRoute`; upsert in place of insert). the
   desired state becomes a post-condition.
3. **reconcile** — read current state, then add/move/drop to reach exactly desired
   (e.g. `setVpcRouteTableAssociations`: skip-if-ours, move-if-elsewhere, drop-if-undesired).
4. **verify then fail loud** — if the only safe response to a conflict is to confirm the
   extant resource IS desired, read it and confirm; if it diverges, fail loud. never
   reconcile a destructive change silently (e.g. a detach of another vpc's igw).

**tolerate a conflict ONLY when** the conflict's uniqueness key provably covers the full
desired identity, so "already extant" IS "equals desired" (the SecurityGroup rule case).
document that equivalence at the call site.

## .the test

before you swallow any conflict, ask:

> "could the extant resource differ from what i desire along a dimension this conflict does
> NOT key on?"

- **no** (key == identity) → tolerate is safe; note why at the call site.
- **yes** (key ⊂ identity) → tolerate is a failhide; converge, reconcile, or verify instead.

## .enforcement

- a set op that tolerates a conflict whose key is a subset of the desired identity = blocker
- "assumed" idempotency (tolerate without a full-identity key) presented as idempotent = blocker
- a re-run that produces drift (non-KEEP plan) = blocker — the op is not truly idempotent

## .see also

- `src/domain.operations/aws/tolerateExtantConflict.ts` — carries the `.safe`/`.unsafe` contract
- `rule.forbid.failhide` (mechanic role) — assumed idempotency is a specific flavor of failhide
- `rule.require.idempotent-procedures` (mechanic role) — the general idempotency mandate
- the orphan-hazard rule in this briefs dir — the leak that non-idempotency creates
