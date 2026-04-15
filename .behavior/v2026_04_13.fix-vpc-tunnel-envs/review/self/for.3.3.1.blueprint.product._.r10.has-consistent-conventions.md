# self-review r10: has-consistent-conventions

## comprehensive convention audit

reviewed DeclaredAwsVpcTunnel.ts source to verify blueprint follows all conventions.

### 1. jsdoc comment style

| extant pattern | blueprint | match? |
|----------------|-----------|--------|
| `.what = ` prefix | uses `.what = ` | yes |
| `.why = ` prefix | uses `.why = ` | yes |
| `.note = ` prefix | uses `.note = ` where needed | yes |
| single-line for simple | matches | yes |
| multiline `/**` ... `*/` | matches | yes |

**holds**: blueprint follows jsdoc style.

### 2. import order

extant order in DeclaredAwsVpcTunnel.ts:
1. external packages (`domain-objects`)
2. internal types (`./Declared*`)

blueprint adds no new imports to DeclaredAwsVpcTunnel.ts.

**holds**: no import changes needed.

### 3. class structure order

extant order in DeclaredAwsVpcTunnel class:
1. `public static unique`
2. `public static metadata`
3. `public static readonly`
4. `public static nested`

blueprint modifies only `unique` array value, preserves order.

**holds**: class structure preserved.

### 4. export style

extant pattern:
- `export interface` before `export class`
- interface and class have same name
- class `extends DomainEntity<T> implements T`

blueprint preserves this pattern.

**holds**: export style preserved.

### 5. field declaration style

extant field pattern in interface:
```ts
/**
 * .what = description
 */
fieldName: Type;
```

blueprint adds `account` field per same pattern:
```ts
/**
 * .what = the aws account id whose credentials opened this tunnel
 */
account: string;
```

**holds**: field declaration style matches.

### 6. nested literal pattern

extant DeclaredAwsVpcTunnelVia, Into, From:
- interface before class
- `extends DomainLiteral<T> implements T`
- `public static nested` for refs

blueprint adds no new nested literals.

**holds**: no nested literal changes.

### 7. type annotation style

extant patterns:
- explicit types on fields
- `as const` on static arrays
- `RefByUnique<typeof T>` for refs

blueprint uses:
- `account: string` (explicit)
- `['account', 'via', 'into', 'from'] as const` (same pattern)

**holds**: type annotation style matches.

### 8. file name conventions

| file | convention | match? |
|------|------------|--------|
| DeclaredAwsVpcTunnel.ts | `Declared<Provider><Resource>.ts` | yes |
| getTunnelHash.ts | `get<Entity>Hash.ts` | yes |
| castIntoDeclaredAwsVpcTunnel.ts | `castInto<DomainObject>.ts` | yes |

**holds**: file names follow conventions.

### 9. hash serialization object

reviewed getTunnelHash.ts pattern. extant:
```ts
const serialized = serialize({
  account: context.aws.credentials.account,
  region: context.aws.credentials.region,
  via: input.for.tunnel.via,
  into: input.for.tunnel.into,
  from: input.for.tunnel.from,
  _v: 'v2025_11_27',
});
```

blueprint changes:
- `account: input.for.tunnel.account` (from input, not context)
- `_v: 'v2026_04_13'` (version bump)

order preserved, only source and version change.

**holds**: serialization object style preserved.

## summary

| convention | verified | status |
|------------|----------|--------|
| jsdoc style | yes | match |
| import order | yes | no change |
| class structure | yes | preserved |
| export style | yes | preserved |
| field declaration | yes | match |
| nested literal | yes | no change |
| type annotation | yes | match |
| file names | yes | match |
| hash serialization | yes | preserved |

## what holds

all nine convention categories verified. blueprint follows extant patterns.

## issues found

none. all conventions match.
