# rule.require.decompose-attributes-on-common-nouns

## severity: blocker

## .what

> **before you declare a flat set of attributes, factor it. if several attributes share a noun,
> that noun is a dimension — decompose on it.**

a flat list is a **product already walked and then flattened**. the dimensions that produced it are
still in the names; the flat form merely hides them. recover them, and the nest writes itself.

```ts
// 👎 flat — four peers, and the axes are in the names where no reader can use them
{ blockAcls, ignoreAcls, blockPolicy, restrictBuckets }

// 👍 factored — the 2x2 that produced them
{ acls:     { block, ignore },
  policies: { block, restrict } }
```

⇒ the method is `howto.factor-an-attribute-set`. this rule states **that you must run it**.

## .why

- **a flat list makes the reader re-derive the axes on every read**
  - the shared noun is present in every name and carries no structure
  - so `blockAcls` and `ignoreAcls` read as two unrelated booleans until the reader notices the suffix
- 🔴 **a flat list hides an absent cell**
  - a 2x2 with three members is a **gap you can see**
  - the same three as a flat list are just three attributes, and nobody asks what the fourth would be
- 🔴 **a flat list hides a LIE**
  - `restrictPublicBuckets` says *buckets* and acts on **policies** — aws's own doc says so twice
  - the mis-named attribute is invisible flat and **obvious in a table**, because it lands in the
    wrong row
- **the path pays forever**
  - `access.public.acls.block` names its subject at every segment
  - `access.public.blockAcls` names it once, in a compound word the reader must split

⇒ the cost is paid once by the author and saved on every read, by every consumer
(`philosophy.pavement-saves-nature`).

## .the test

> **write each attribute as `(subject, operation)`. tabulate. is the table dense?**

- **dense** — most cells filled → the subjects are your group keys. decompose
- **sparse** — the axes are not real. leave it flat
- **a cell does not fit** → 🔴 check the NAME before you call it an exception. a mis-named attribute
  is far more common than a genuine outlier

## .when it fires

| when… | then… |
|---|---|
| you declare **three or more** attributes on one object | the trigger. tabulate before you ship |
| a word repeats across attribute names | that word is a candidate dimension |
| an attribute's doc says *"does not affect X"* | 🔴 the sharpest tell — it names its own complement |
| the count is a product — 4, 6, 8, 9 | suspicious. a product is what a walked space yields |
| you adopt a third party's flat field set | **their flatness is not your contract.** factor it |
| one name does not fit the table | re-read its doc. it probably lies about its subject |
| a group would hold exactly **one** member | 🔴 not a group. fold it into its true peer, or leave flat |
| the table is sparse | leave it flat. an invented dimension is worse than none |

## .the bound — do not nest to be clever

| a violation | not a violation |
|---|---|
| a dense dimension left unrecovered on a new public contract | a sparse set left flat |
| a group of one, created to make the shape look symmetric | a genuine singleton left at the top level |
| a dimension **invented** to force a nest | a dimension **discovered** in the names and docs |
| a third party's flat set adopted verbatim as our contract | a third party's **wire shape**, which we do not own |

**the line that parts them: did you FIND the dimension, or SUPPLY it?** found → decompose. supplied
→ `rule.prefer.wet-over-dry` — leave it flat until a second instance proves the axis.

🟡 **each level of depth is a real cost** — a nested domain-object, a strict schema at that depth, a
longer path, one more hydration site. a dimension must earn it.

## .enforcement

- a **new public contract** that declares a dense, recoverable dimension flat = **blocker**
- an attribute whose name names the wrong subject = **blocker** (`rule.forbid.ambiguous-labels`)
- a group of one member = **blocker** (it partitions naught)
- a dimension invented where the table is sparse = **blocker** (`rule.prefer.wet-over-dry`)
- internal code with an unrecovered dimension = **nitpick**

## .the discovery case

`declastruct-aws#99`, `access.public`. aws's `PublicAccessBlockConfiguration` ships four flat
booleans. their own field docs (`@aws-sdk/client-s3` `models_0.d.ts:10137-10183`) reveal a 2x2:

| | **reject NEW** | **neutralize EXTANT** |
|---|---|---|
| **acls** | `BlockPublicAcls` — *"PUT … calls fail if the specified ACL is public"* · *"doesn't affect existing"* | `IgnorePublicAcls` — *"ignore all public ACLs"* · *"doesn't prevent new"* |
| **policies** | `BlockPublicPolicy` — *"reject calls to PUT Bucket policy"* · *"doesn't affect existing"* | `RestrictPublicBuckets` — *"restricts access … if the bucket has a public policy"* |

three facts the flat list hid, and the table shows at a glance:

1. **the 2x2 is dense** — four of four cells filled, so the axes are real
2. 🔴 **`RestrictPublicBuckets` is a policy field with a bucket's name** — it lands in the policy
   row on its own doc's evidence
3. **`ignore` and `restrict` are not synonyms** — ignore removes an acl's effect; restrict keeps the
   policy and bounds who it reaches. same column, different mechanism

⇒ ⚠️ **the second fact is why a first-pass group on the literal nouns is wrong**:
`{ acls: {…}, policies: { block }, buckets: { restrict } }` yields two groups of one and files a
policy under `buckets`. **the docs settle the subject; the names do not.**

## .see also

- `howto.factor-an-attribute-set` — the method this rule mandates
- `rule.require.group-by-noun-not-verb` (architect) — the same discipline at the directory grain
- `howto.dimensional-decomposition` (architect) — the **forward** move: walk known axes to find
  members. this is the **inverse**: read the members to recover the axes
- `rule.forbid.ambiguous-labels` (ergonomist) — why a mis-named subject is a blocker
- `rule.prefer.wet-over-dry` (mechanic) — the bound: discover the dimension, never invent it
- `rule.require.treestruct` (mechanic) — `[...noun][state]`, which a factored set satisfies by shape
