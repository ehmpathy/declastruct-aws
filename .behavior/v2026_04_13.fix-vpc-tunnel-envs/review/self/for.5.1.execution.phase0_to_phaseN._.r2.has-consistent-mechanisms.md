# self-review r2: has-consistent-mechanisms

## mechanism consistency check

reviewed all code changes for new mechanisms that duplicate extant functionality.

### new mechanisms introduced

| file | mechanism | new? |
|------|-----------|------|
| DeclaredAwsVpcTunnel.ts | account + region fields | extension of extant domain object |
| getTunnelHash.ts | signature change | refactor of extant transformer |
| castIntoDeclaredAwsVpcTunnel.test.ts | test file | tests extant operation |

### analysis

**1. no new utilities created**

all changes extend or refactor extant mechanisms:

- `DeclaredAwsVpcTunnel` — extant domain object, added fields
- `getTunnelHash` — extant transformer, changed input source
- `castIntoDeclaredAwsVpcTunnel` — extant operation, new tests only

**2. no duplicate patterns**

checked for related codepaths:

| pattern | extant location | new usage |
|---------|-----------------|-----------|
| RefByUnique input | used throughout codebase | reused in getTunnelHash |
| domain object unique keys | standard pattern | followed |
| serialize for hash | already in getTunnelHash | no change |
| crypto.createHash | already in getTunnelHash | no change |

**3. test file consistency**

new test file `castIntoDeclaredAwsVpcTunnel.test.ts` follows extant patterns:

- uses `given/when/then` from test-fns (extant)
- uses `describe` block structure (extant)
- tests extant operation (not a new mechanism)

## what holds

no new mechanisms introduced:

1. **domain object extension** — added fields to extant class, not new class
2. **transformer refactor** — changed input source, not new transformer
3. **test coverage** — tests extant operation, follows extant patterns
4. **no new utilities** — no new hash functions, serializers, or converters

all changes use extant mechanisms consistently.
