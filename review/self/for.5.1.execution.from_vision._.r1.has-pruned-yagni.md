# self review r1 — has-pruned-yagni

## question: did i add extras not prescribed by the vision?

i walked every component against `1.vision.yield.md`. verdict: no speculative extras. detail
below.

## components, each traced to a vision requirement

| component | prescribed by | verdict |
|-----------|---------------|---------|
| `DeclaredAwsSsmParameterPlain` | vision req 1, "two resources split by sensitivity" | required |
| `DeclaredAwsSsmParameterSecure` | vision req 1 + write-only replication | required |
| get/set/cast/del ops per resource | vision "domain object + get/set/cast ops + dao" | required |
| `DeclaredAwsSsmParameterPlainDao` / `SecureDao` | rule.require.dao-and-acceptance-per-declared-resource | required |
| provider type-map + daos-map entries | same rule (registration) | required |
| sdk index exports | same rule (sdk export) | required |
| `describeOneParameter` sdk wrapper | vision groundwork: metadata-only get, NO GetParameter | required |
| `asSsmParameterName` transformer | extracted to clear mech-decode-friction blocker | required (decomposition, not a feature) |
| `asSsmParameterIdentifier` transformer | same | required |
| acceptance: plain + secure KEEP + create-without-value error | rule.require.acceptance + rule.forbid.friction-hazards | required |

## what i deliberately did NOT add (YAGNI held)

- **no `tier` field** — vision [answered]: omitted from v1 (cost footgun, drift noise; AWS
  defaults to Standard). add later only on a real >4 KB / policy need
  (rule.prefer.wet-over-dry).
- **no `StringList` support** — vision [answered]: OUT OF SCOPE. only String + SecureString.
- **no hash / salt / HMAC** — the vision's core decision is zero secret-derived artifacts. i
  built the pure write-only model, not the earlier salted-hash design.
- **no `omitWriteonly` + `valueVersion` enhancement** — vision [answered]: NOT pursued; pure
  github replication stands.

## the two transformers — are they YAGNI?

no. they are not speculative abstraction. each was carved out of an orchestrator to remove
inline decode-friction (ref-route selection + arn regex), on a peer reviewer's blocker. each
has one caller today (name → secure get/del; identifier → plain get) and a unit test. this is
decomposition of extant logic, not future-flex.

## conclusion

0 YAGNI violations. every component maps to a vision requirement or a rule mandate; every
candidate extra (tier, StringList, hash, enhancement) was consciously left out per explicit
vision answers.
