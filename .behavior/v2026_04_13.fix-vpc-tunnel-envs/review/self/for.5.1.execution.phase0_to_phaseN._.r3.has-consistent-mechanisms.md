# self-review r3: has-consistent-mechanisms

## mechanism consistency check

searched for related codepaths: `createHash|serialize` in src/

found extant hash mechanisms:
- `src/domain.operations/lambdaVersion/utils/calcConfigSha256.ts`
- `src/domain.operations/lambda/utils/calcCodeSha256.ts`
- `src/domain.operations/vpcTunnel/utils/getTunnelHash.ts`

### extant hash mechanisms comparison

| mechanism | purpose | output format |
|-----------|---------|---------------|
| calcConfigSha256 | lambda config identity | base64 (AWS format) |
| calcCodeSha256 | lambda code identity | base64 (AWS format) |
| getTunnelHash | cache file names | hex, 16 chars |

each serves a distinct purpose with domain-appropriate output:
- lambda hashes use base64 to match AWS SDK expectations
- tunnel hash uses hex slice for safe cache filenames

### could we share a common utility?

**answer: no**

reasons:
1. **output formats differ** — base64 vs hex+truncate
2. **serialization differs** — sorted JSON vs serialize+JSON.parse
3. **inputs differ** — config object vs RefByUnique
4. **purposes differ** — AWS identity vs local cache file names

a shared "hash utility" would require:
- parameterized output format
- parameterized serialization strategy
- parameterized truncation

this would be premature abstraction for 3 callers with different needs.

### patterns followed

| pattern | extant usage | our usage |
|---------|--------------|-----------|
| domain-objects serialize | throughout codebase | used in getTunnelHash |
| crypto.createHash('sha256') | lambda utilities | used in getTunnelHash |
| RefByUnique input type | throughout codebase | used in getTunnelHash |
| jsdoc .what/.why/.note | throughout codebase | used in getTunnelHash |

## what holds

no new mechanisms duplicate extant functionality:

1. **getTunnelHash** — extant mechanism, only refactored input source
2. **no new hash utility** — reuses extant serialize + createHash pattern
3. **no common hash abstraction** — would be premature; 3 callers have different needs
4. **patterns followed** — serialize, RefByUnique, jsdoc all match extant usage
