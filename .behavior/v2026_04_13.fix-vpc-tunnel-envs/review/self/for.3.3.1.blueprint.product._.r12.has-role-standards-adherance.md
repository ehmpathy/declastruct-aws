# self-review r12: has-role-standards-adherance

## relevant mechanic rule directories

based on blueprint content:
1. `code.prod/evolvable.domain.objects/` — domain object changes
2. `code.prod/evolvable.domain.operations/` — transformer changes
3. `code.prod/readable.comments/` — jsdoc style
4. `code.prod/pitofsuccess.typedefs/` — type definitions
5. `code.test/` — test coverage
6. `lang.terms/` — term conventions

## rule-by-rule check

### rule.require.immutable-refs

**rule**: refs must be immutable; primary and unique keys must be stable identifiers.

**blueprint**: adds `account` to unique keys

**check**: is `account` immutable?
- yes. AWS account ID doesn't change for a tunnel once opened.
- a tunnel opened with dev credentials stays dev credentials.

**holds**: account is immutable as unique key.

### rule.forbid.nullable-without-reason

**rule**: nullable attributes require clear domain reason.

**blueprint**: adds `account: string` (not nullable)

**check**: should account be nullable?
- no. a tunnel must always know which account credentials opened it.
- absent account would break identity comparison.

**holds**: account is correctly non-nullable.

### rule.forbid.undefined-attributes

**rule**: never allow undefined for domain objects except database-generated metadata.

**blueprint**: `account: string` (no `?` modifier)

**check**: correct. account is required, not optional.

**holds**: no undefined attributes.

### rule.require.what-why-headers

**rule**: jsdoc with `.what = ` and `.why = `

**blueprint** (from codepath tree):
```
/**
 * .what = the aws account id whose credentials opened this tunnel
 */
account: string;
```

**check**: has `.what = `. doesn't need `.why = ` (simple field).

**holds**: jsdoc style correct.

### rule.require.get-set-gen-verbs

**rule**: domain operations use get, set, or gen verbs.

**blueprint operations**:
- `getTunnelHash` — get verb ✓
- `castIntoDeclaredAwsVpcTunnel` — cast prefix (transformer pattern) ✓

**check**: cast* is standard transformer pattern in declastruct repos.

**holds**: verb conventions correct.

### rule.require.input-context-pattern

**rule**: procedures use `(input, context)` pattern.

**blueprint**:
- getTunnelHash: `(input: { for: { tunnel: ... } }, context: ...)` ✓
- castIntoDeclaredAwsVpcTunnel: `(input: { unique: ..., status: ..., pid: ... })` ✓

**holds**: input-context pattern followed.

### rule.require.test-coverage-by-grain

**rule**: transformers need unit tests; orchestrators need integration tests.

**blueprint test coverage**:
- DeclaredAwsVpcTunnel.test.ts — unit test for domain object ✓
- getTunnelHash.test.ts — unit test for transformer ✓
- castIntoDeclaredAwsVpcTunnel.test.ts — unit test for transformer ✓

**holds**: all transformers have unit tests.

### rule.forbid.as-cast

**rule**: forbid `as` casts without documentation.

**blueprint**: no `as` casts introduced.

**holds**: no violations.

### rule.require.shapefit

**rule**: types must fit; mismatches signal defects.

**blueprint**: `account: string` fits AWS account ID shape.

**check**: AWS account IDs are 12-digit strings (e.g., "874711128849"). `string` is appropriate.

**holds**: type fits domain.

## issues found

none. blueprint adheres to mechanic standards.

## what holds

all mechanic standards verified:
1. immutable unique key (account) ✓
2. non-nullable field ✓
3. no undefined attributes ✓
4. jsdoc style ✓
5. verb conventions ✓
6. input-context pattern ✓
7. test coverage by grain ✓
8. no as casts ✓
9. shapefit ✓
