# self-review r13: has-role-standards-coverage

## coverage question

did we forget any required patterns? (error handle, validation, tests, types, etc.)

## rule directory enumeration

| directory | coverage question |
|-----------|-------------------|
| `code.prod/evolvable.domain.objects/` | domain object patterns |
| `code.prod/evolvable.domain.operations/` | operation patterns |
| `code.prod/evolvable.procedures/` | procedure patterns |
| `code.prod/pitofsuccess.errors/` | error handle patterns |
| `code.prod/pitofsuccess.typedefs/` | type safety |
| `code.test/` | test coverage |

## coverage checks

### error handle coverage

**question**: did we forget error handle?

**blueprint operations**:
- `getTunnelHash` — pure function, no error paths (input is typed, hash always succeeds)
- `castIntoDeclaredAwsVpcTunnel` — pure function, no error paths (input is typed, cast always succeeds)

**analysis**: these are transformers. they don't throw errors because they're pure computations. error handle would be in orchestrators that call them.

**holds**: no error handle needed in transformers.

### validation coverage

**question**: did we forget validation?

**blueprint**:
- `account: string` — type validation via TypeScript
- domain-objects library validates at instantiation

**analysis**: validation happens at:
1. compile time: TypeScript enforces `account` is required
2. runtime: domain-objects validates shape on `new DeclaredAwsVpcTunnel()`

**holds**: validation covered by type system and domain-objects.

### test coverage

**question**: did we forget tests?

**blueprint test tree**:
```
├── DeclaredAwsVpcTunnel.test.ts      — domain object tests
├── getTunnelHash.test.ts             — transformer unit tests
└── castIntoDeclaredAwsVpcTunnel.test.ts  — transformer unit tests [+]
```

**analysis**: all modified files have their tests. new file gets new test.

**holds**: test coverage complete.

### type coverage

**question**: did we forget types?

**blueprint**:
- `account: string` — typed
- `unique = ['account', 'via', 'into', 'from'] as const` — typed
- `RefByUnique<DeclaredAwsVpcTunnel>` — now includes account

**analysis**: all types are explicit. no `any`, no implicit types.

**holds**: type coverage complete.

### jsdoc coverage

**question**: did we forget documentation?

**blueprint**:
```ts
/**
 * .what = the aws account id whose credentials opened this tunnel
 */
account: string;
```

**analysis**: new field has jsdoc. implementation notes document design decisions.

**holds**: documentation complete.

### idempotency coverage

**question**: did we forget idempotency?

**blueprint operations**:
- `getTunnelHash` — pure, deterministic, same input = same output ✓
- `castIntoDeclaredAwsVpcTunnel` — pure, deterministic ✓

**analysis**: transformers are inherently idempotent (no side effects).

**holds**: idempotency maintained.

### version bump coverage

**question**: did we forget cache invalidation?

**blueprint**: `_v: 'v2026_04_13'` — version bumped

**analysis**: old cache files (without account in hash) will be invalidated.

**holds**: cache invalidation covered.

### consumer break coverage

**question**: did we forget to document the break?

**blueprint implementation notes**:
> **break for consumers**: all consumers must update to pass `account`

**analysis**: break is documented with specific guidance.

**holds**: break documentation complete.

## what's absent that should be present?

reviewed each category:
- error handle — n/a for pure transformers ✓
- validation — covered by type system ✓
- tests — all files have tests ✓
- types — all explicit ✓
- jsdoc — new field documented ✓
- idempotency — inherent in transformers ✓
- cache invalidation — version bumped ✓
- break docs — included ✓

## issues found

none. all required patterns are present.

## what holds

coverage is complete:
1. error handle — n/a (pure transformers)
2. validation — type system + domain-objects
3. tests — all files covered
4. types — all explicit
5. jsdoc — new field documented
6. idempotency — inherent
7. cache invalidation — version bump
8. break documentation — implementation notes
