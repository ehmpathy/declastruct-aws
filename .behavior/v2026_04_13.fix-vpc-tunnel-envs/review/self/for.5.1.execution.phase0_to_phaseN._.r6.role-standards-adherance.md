# self-review r6: role-standards-adherance

## relevant briefs directories

checked these mechanic standards directories:
- `practices/code.prod/evolvable.domain.objects/` — domain object patterns
- `practices/code.prod/evolvable.domain.operations/` — operation patterns
- `practices/code.prod/evolvable.procedures/` — procedure patterns
- `practices/code.prod/readable.comments/` — jsdoc and comment patterns
- `practices/code.test/frames.behavior/` — test patterns (given/when/then)
- `practices/lang.terms/` — name conventions
- `practices/lang.tones/` — style conventions

## file-by-file verification

### DeclaredAwsVpcTunnel.ts

**rule.forbid.undefined-attributes**: verified
- `account: string` — not optional, not undefined
- `region: string` — not optional, not undefined
- all fields have explicit types

**rule.forbid.nullable-without-reason**: verified
- neither account nor region is nullable
- they are required identity fields

**rule.require.immutable-refs**: verified
- account and region are unique keys (immutable by definition)
- added to `static unique` array

**rule.require.what-why-headers**: verified
- both fields have `.what = ` jsdoc comments
- pattern matches extant fields in file

**rule.prefer.lowercase**: verified
- jsdoc uses lowercase ("the aws account id...")
- matches extant style in file

### DeclaredAwsVpcTunnel.test.ts

**rule.require.given-when-then**: verified
- test uses `given`, `when`, `then` from test-fns
- structure follows bdd pattern

**rule.forbid.redundant-expensive-operations**: verified
- no redundant calls in then blocks
- tunnel instantiation happens once per when block

**name conventions**: verified
- no gerunds in test descriptions
- "valid account, region, via, into, from, and status" — clear, no gerunds

### getTunnelHash.ts

**rule.require.input-context-pattern**: verified
- signature changed from `(input, context)` to `(input)` only
- this is correct: account and region now come from input, not context
- context was only used for credentials, no longer needed

**rule.require.what-why-headers**: verified
- jsdoc has `.what = `, `.why = `, `.note = `
- `.note` updated to reflect new source of account/region

**rule.require.arrow-only**: verified
- uses arrow function syntax

**rule.require.single-responsibility**: verified
- one operation per file
- filename matches exported function

### getTunnelHash.test.ts

**rule.require.given-when-then**: verified
- all tests use given/when/then pattern

**name conventions**: verified
- "same tunnel via/into/from with different account" — no gerunds
- "same tunnel via/into/from with different region" — no gerunds

**rule.require.useThen-useWhen-for-shared-results**: not applicable
- no shared expensive operations in these tests
- each then block computes hash directly (cheap operation)

### castIntoDeclaredAwsVpcTunnel.test.ts (new file)

**rule.require.given-when-then**: verified
- uses given/when/then from test-fns

**rule.forbid.redundant-expensive-operations**: verified
- single `castIntoDeclaredAwsVpcTunnel` call in when block
- result shared via closure across then blocks

**name conventions**: verified
- "a unique ref with account and region" — no gerunds
- "account is present in output" — clear, no gerunds

### getVpcTunnel.ts and setVpcTunnel.ts

**rule.require.input-context-pattern**: verified
- getTunnelHash calls updated: removed context argument
- context still passed to other operations that need it

### getVpcTunnel.test.ts and setVpcTunnel.test.ts

**rule.require.given-when-then**: verified
- tests follow bdd pattern

**fixtures updated**: verified
- all tunnelRef objects include account and region
- 12-digit account id format matches conventions

## issues found

none. all code follows mechanic role standards.

## what holds

1. **domain object standards** — fields are typed, not optional, have jsdoc
2. **operation standards** — arrow functions, single responsibility, proper signatures
3. **test standards** — bdd pattern with given/when/then
4. **name conventions** — no gerunds, lowercase in comments
5. **comment standards** — jsdoc with .what/.why patterns

