# howto.factor-an-attribute-set

## .what

the method behind `rule.require.decompose-attributes-on-common-nouns`: how to take a flat list of
attributes and recover the dimensions that produced it.

**five steps, and step 3 is where the value is.**

## .the method

### 1. list the attributes flat, with their docs

not the names alone. **the doc is the evidence; the name is a claim about it**, and the two disagree
more often than an author expects.

### 2. split each name into `(subject, operation)`

- **subject** = what it acts on — a noun
- **operation** = what it does to that subject — a verb

```
BlockPublicAcls       -> (acl,    block)
IgnorePublicAcls      -> (acl,    ignore)
BlockPublicPolicy     -> (policy, block)
RestrictPublicBuckets -> (bucket, restrict)    <- read the doc before you trust this
```

🟡 **a word that appears in EVERY name is not a dimension** — it is the set's own subject, and it
belongs on the parent key. `Public` ×4 became `access.public`, not a fifth column.

### 3. 🔴 correct each subject against its DOC, not its name

this is the step that pays, and the step that gets skipped.

> `RestrictPublicBuckets` — *"restricts access to this bucket … **if the bucket has a public
> policy**"*

⇒ its subject is the **policy**. the name says `Buckets` and is legacy. re-file it:

```
RestrictPublicBuckets -> (policy, restrict)
```

**a name is authored under deadline by someone who held a different mental model. a doc describes
behaviour.** when they disagree, the doc wins (`def.domain-discovery` — *"the map is not the
territory"*).

### 4. tabulate — subject down, operation across

| | block | ignore | restrict |
|---|---|---|---|
| **acl** | ✅ | ✅ | — |
| **policy** | ✅ | — | ✅ |

then **condense synonymous operations into one column**. `ignore` and `restrict` both neutralize an
extant object; they differ in mechanism, not in role:

| | **reject NEW** | **neutralize EXTANT** |
|---|---|---|
| **acls** | `block` | `ignore` |
| **policies** | `block` | `restrict` |

⇒ 🟢 **dense: four of four.** the axes are real.

### 5. grade the table, then decompose

| the table | the verdict |
|---|---|
| **dense** — most cells filled | the subjects are your group keys. nest |
| **one row full, the rest single** | not a dimension. leave flat |
| **sparse** — many empty cells | the axes are invented. leave flat |
| **an empty cell in an otherwise dense table** | 🔴 **the most valuable output.** ask what belongs there |

## 🔴 .the tells — what says a flat list conceals a product

ranked by how reliably each one fires:

| tell | why it works |
|---|---|
| 🔴 **a doc names its own complement** — *"does not affect extant"*, *"does not prevent new"* | the author knew about the peer field and said so. **strongest signal there is** |
| a word fragment repeats across names | `Acls` ×2, `Block` ×2, `Public` ×4 — each repeat is a candidate axis |
| the count is a product — 4, 6, 8, 9 | a walked space yields a product. a coincidence is possible, a check is cheap |
| two names differ by exactly one word | that word is the axis and the rest is the cell |
| one name breaks the pattern | usually a mis-name, rarely an exception. **check step 3** |
| the set has a shared prefix or suffix | that is the parent key, not a dimension |

## .the traps

| trap | what happens | the fix |
|---|---|---|
| 🔴 **trust the name over the doc** | a policy field lands under `buckets`; two groups of one | step 3 |
| **a group of one** | a path segment that partitions naught, plus a schema level | fold it, or leave flat |
| **invent the axis** | a nest that fits today's members and breaks on the next one | `rule.prefer.wet-over-dry` |
| **take the third party's flatness** | you inherit their legacy names as your public contract | their wire shape is theirs; your contract is yours |
| **nest past what the reader holds** | `a.b.c.d.e` — depth beyond ~3 costs more than it saves | stop at the dense axes |

## .the worked case, end to end

`declastruct-aws#99`. aws ships four flat booleans; the factor found a 2x2.

| step | what it produced |
|---|---|
| 1 | four names + four doc blocks (`models_0.d.ts:10137-10183`) |
| 2 | `(acl, block)` `(acl, ignore)` `(policy, block)` `(bucket, restrict)` |
| 3 | 🔴 `bucket` → `policy`, on the doc's own words |
| 4 | 2x2, dense: `{acls, policies}` × `{reject new, neutralize extant}` |
| 5 | `{ acls: { block, ignore }, policies: { block, restrict } }` |

**the first-pass answer, before step 3, was wrong:**

```ts
{ acls: { block, ignore }, policies: { block }, buckets: { restrict } }   // 👎
```

two groups of one, and a policy filed under `buckets`. ⇒ **the group that emerges before you read
the docs is the group the legacy names hand you.**

## .when NOT to run this

- fewer than three attributes — there is no product to recover
- the attributes are genuinely unrelated — a `name`, a `createdAt`, a `tags`
- you model a **wire shape** you do not own. cast at the boundary, factor on our side only

## .see also

- `rule.require.decompose-attributes-on-common-nouns` — the rule this method serves
- `howto.dimensional-decomposition` (architect) — the **forward** move: walk known axes to enumerate
  members. this is the **inverse**: read the members to recover the axes
- `howto.domain-discovery` (architect) — step 3 is *"name from the motive"* + *"the five whys"*,
  applied to one attribute
- `rule.require.ubiqlang` (mechanic) — one canonical word per concept, which the operation column
  enforces by construction
