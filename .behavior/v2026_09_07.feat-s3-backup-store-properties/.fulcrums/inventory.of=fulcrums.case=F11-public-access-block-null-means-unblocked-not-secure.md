# F11 — `publicAccessBlock: null` means UNBLOCKED, not "secure by default"

**rework** clean now, dirty after ship · **status** 🟢 **RULED 2026-09-09 — OVERRULED to (b), `null`
MEANS THE SECURE DEFAULT** · **confidence** ~~68%~~ → settled
**where** `DeclaredAwsS3Bucket.publicAccessBlock` — its *null semantics*, not its shape

⚠️ **the title states the fork AS FRAMED, and the council took the other side.** a fulcrum's name
records the question, never the answer. 🔴 **this was the lowest-confidence entry (68%) and it was
overruled** — the inventory's own argument for why a confidence column earns its place.

⚠️ **found by the r1 self-review's arm 3**, on the read of the peer file F2 cites as its whole
justification. **F2 settled the SHAPE and never asked what `null` should MEAN.**

## .the fork, stated fairly

F2 models the block as four booleans and takes `null` to mean *"no block configured"* — a faithful
mirror of aws's 404. that is honest, and it round-trips.

🔴 **but the closest peer in this package makes the opposite call for the analogous security
control**, and documents exactly why. `DeclaredAwsEc2InstanceMetadataOptions` — the file F2 cites —
ships **two** frozen consts, not one:

```ts
export const ec2InstanceMetadataOptionsSecure      = Object.freeze({ httpTokens: 'required', … });
export const ec2InstanceMetadataOptionsAwsImplicit = Object.freeze({ httpTokens: 'optional', … });
```

> *"a launch template created with **NO** MetadataOptions is imdsv1-allowed at AWS … the cast reads
> such a template back as **these values (NOT null)** so it does NOT collapse to the secure default —
> a pre-feature template **plans a change** … instead of a **false KEEP that masks an insecure box**"*

⇒ in the peer, **`null` = apply the SECURE default**, and the *absent* remote state is modeled as its
own explicit (insecure) value so it cannot masquerade as converged.

## .the options

| option | `null` means | a 404 reads as | a pre-extant unblocked bucket |
|--------|--------------|----------------|-------------------------------|
| **(a)** — F2's best-guess | "no block configured" | `null` | **KEEP** — it is already what was declared |
| **(b)** — 🟢 **taken**, the peer's shape | "apply the secure default (all four true)" | an explicit all-**false** const (`s3BucketPublicAccessBlockNone`) | **UPDATE** — it plans the block on, loudly |

## 🔴 .why (b) — four arguments, and the fourth is a defeater

1. **(a) is insecure-by-default on the easiest path.** `publicAccessBlock: null` is the least effort
   a consumer can spend, and it leaves the bucket public-capable.
   `rule.require.safe-by-default` grades *"an unsafe outcome reachable without a deliberate, explicit
   step"* a **blocker**, and its test is *"if a hurried human does the most obvious move, is the
   result safe?"* under (a) the answer is **no**.
2. **the peer weighed this exact tradeoff and chose (b)** — for imdsv2, a control with the same shape
   (an optional aws sub-block whose absence is the insecure state).
   `rule.require.symmetry-with-peer-resources` is the rule F2 already invokes for its shape; it points
   at (b) here.
3. **the wish is a BACKUP STORE.** exposure is the headline risk, and the consumer's own words for
   this feature are *"not public"*.
4. 🔴 **(a) DEFEATS THE REQUIREMENT'S OWN PURPOSE.** the block bills no dollars and leaks no cost; the
   other three properties are justified by *"two failure modes … both of which bill silently"*.
   **the block is in this wish for exactly one reason: to make a backup store non-public.** under (a)
   the cheapest path through the feature produces the exact outcome the feature was added to prevent.
   ⇒ **a purpose defeat, not a tie-breaker**, and no argument on the (a) side answers it.

## 🟢 .(b) is also the CHEAPER option

`delPublicAccessBlock` is owed **only under (a)**, where `null` is a state to converge *to*
(`setS3Bucket.ts:86-87` calls `delBucketLifecycle` precisely when `desired.lifecycle` is null):

| item | under **(a)** | under **(b)** |
|------|--------------|--------------|
| the `delPublicAccessBlock` communicator | owed | ⛔ **does not exist** — every declared value is a `Put` |
| its integration test | **blocker-grade** per `rule.require.test-coverage-by-grain` | ⛔ **not owed** |
| **assumption A-7** — the iam action for the delete, which the extant grant cannot settle | live, unverified | ⛔ **retired entirely** |

⇒ **safer AND smaller: one fewer communicator, one fewer blocker-grade test, one fewer open
assumption.**

## .the honest costs, taken knowingly

- **(a) is the more faithful mirror of aws**, and this package's stated job is to mirror aws. under
  (b), `null` writes a `PutPublicAccessBlock` the consumer never asked for.
- **(b) makes the four-boolean shape partly decorative** — most consumers write `null` and never see
  it.
- **(b) plans an UPDATE on every extant unblocked bucket** the first time a consumer upgrades. loud,
  and arguably the point — but a large blast radius atop A-1's source break.
- ⚠️ the wish's advisory leans (a), so (b) is a **second** divergence on the same field, stacked on
  F2's shape divergence. the wish pre-authorizes both: *"say why in the yield"*.

## .what the verdict binds

| | |
|---|---|
| **the semantic** | `null` ⇒ all four booleans TRUE. a backup store is secure on the path of least effort |
| 🟢 **the site** | `DeclaredAwsS3Bucket.publicAccessBlock` — a **nested field** (F10). the guarantee is carried by the TYPE |
| **every declared value is a `Put`** | there is no state to converge *to* by deletion |
| ⛔ **do NOT build `delPublicAccessBlock`** | nor its blocker-grade integration test. the communicator count is **4**, not 5 |
| ⛔ **assumption A-7 RETIRES** · ⛔ **case c9 RETIRES** | the delete path and its demo are both gone |
| ⚠️ **cell 12 is REGRADED, not retired** | a `null` desired against a remote that holds some other config issues `PutPublicAccessBlock{all four true}` — which is **cell 9's re-put**. it drops from `demoed · sharp · criti` to `itemized · happy · alter` |
| 🔴 **the critipath count drops 10 → 9** | c9 was the conditional one |

## .rework — clean now, dirty after ship

the same property as F10, and for the same reason: it changes the *sense* of a value consumers write
into their wishes. after `ahbode/infrastructure#35` binds, a flip silently changes what every extant
`null` does — **a semantic break that does not fail to compile**, which is worse than F10's, since
F10's at least breaks the build.

🟢 **the window held.**

## 🔴 .the lesson

the argument that decided it was **already in this entry** —
`rule.require.safe-by-default`'s test, cited under `.why (b)` against the option the entry then took.

⇒ *a rule cited against the option you take is a louder signal than any confidence score*, and it sat
here unread for nine rounds while the 68% was re-examined repeatedly.

## .see also

- `F10` — the placement verdict that removed this guarantee's site, then restored it
- `F13` — retired; the collision that existed only while the site was gone
- `F14` — the field's NAME, still open. 🔴 **this verdict INVERTS F2's objection to `access.public`**
- `F2` — the *shape* decision this *semantics* question sits beside
- `rule.require.safe-by-default` (ergonomist) · `rule.require.symmetry-with-peer-resources`
- `rule.require.immutable-source-of-truth` — the rule the peer's `.note` invokes by name
