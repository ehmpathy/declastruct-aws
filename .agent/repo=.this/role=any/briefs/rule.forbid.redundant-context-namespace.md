# rule.forbid.redundant-context-namespace

## .what

## severity: blocker

forbid a directory (or path segment) whose name repeats the **universal context** that
every file in the repo already shares. this repo is entirely AWS, so an `aws/` directory
inside `src/**` partitions no files — every file is AWS — and adds a segment that carries
zero information. group by the concern that actually VARIES (the resource noun, or the
shared-operation role), never by the constant everyone shares.

> if the segment is true of EVERY sibling, it is not a namespace — it is noise.

## .why

- **it partitions no files.** a namespace earns its place by separation of things; `aws/` in
  an all-AWS repo divides no subset. `src/domain.operations/aws/` sits beside `budget/`,
  `ec2Instance/`, `ssmParameterPlain/`, `vpc/` — all of which are ALSO AWS. the `aws/` folder
  is the lone odd-one-out that breaks the group-by-noun pattern its peers hold.
- **it hides the real concern.** the files under `aws/` (`assertSsmParameterType`,
  `tolerateExtantConflict`, `getTagKeysToRemove`, `reconcileSsmParameterTags`) are
  cross-cutting SHARED operations. a group named "aws" tells a reader nothing about what it
  is; "shared" / "tags" / the resource it serves would. the name should describe what varies,
  not the constant.
- **it recurs.** this has landed three times now — the pull toward an `aws/` catch-all is
  strong precisely because it always "fits" (everything is aws), which is exactly why it is
  worthless as a divider. a rule stops the fourth.
- **it drifts from the peer convention.** `rule.require.symmetry-with-peer-resources` +
  `rule.require.group-by-noun-not-verb` (architect) already establish noun-grouped dirs; a
  bare context dir violates that symmetry.

## .the distinction — context PREFIX on a public type is fine; context DIR is not

do NOT confuse this with the `DeclaredAws*` type prefix:

| construct | example | verdict | why |
|-----------|---------|---------|-----|
| public SDK **type** name | `DeclaredAwsSsmParameterPlain` | ✅ keep | rule-backed public-contract naming (`rule.require.symmetry-with-peer-resources`); the `Aws` clusters the SDK surface + mirrors AWS's own namespaces for discoverability |
| internal **directory** segment | `src/domain.operations/aws/` | ⛔ forbid | an internal folder that groups by the universal context — divides no subset |

the type prefix is a deliberate, exported, discoverability convention. the directory segment
is an internal structure choice that repeats the constant. one earns its place; the other does
not.

## .how to fix

relocate the files to a directory named for the concern that VARIES:

- a resource-agnostic set-op SAFETY primitive with no domain knowledge — pure control flow,
  no domain objects, no aws types (`tolerateExtantConflict`) → the cross-layer `src/infra/`
  layer, grouped by the safety concern it addresses (`src/infra/idempotency/`), beside its
  peer `src/infra/ownership/getResourceOwnershipVerdict`. it is not a domain operation.
- an operation that serves ONE resource family (`assertSsmParameterType`,
  `reconcileSsmParameterTags`) → nest under that family (`ssmParameter/`) or a `tags/` peer,
  per `rule.prefer.most-common-denominator`.

pick the name a reader would guess from its role — never the context every sibling shares.

## .the test

before you create a directory or path segment, ask:

> "is this name true of EVERY other file in the repo (or in this parent)?"

- **yes** → it is the universal context; it divides no subset → forbid. name by what varies.
- **no** → it genuinely divides a subset → allowed.

## .enforcement

- a directory/segment whose name repeats the repo's universal context (e.g. `aws/` in an
  all-AWS repo) = blocker
- a public `DeclaredAws*` type prefix = allowed (rule-backed, see the distinction table)

## .see also

- `rule.require.symmetry-with-peer-resources` — peers cluster by resource noun; a bare context
  dir breaks that symmetry
- `rule.require.group-by-noun-not-verb` (architect) — group by the domain noun
- `rule.prefer.most-common-denominator` (architect) — where a shared operation should live
- `rule.forbid.buzzwords` (mechanic) — a name that adds no information is noise
