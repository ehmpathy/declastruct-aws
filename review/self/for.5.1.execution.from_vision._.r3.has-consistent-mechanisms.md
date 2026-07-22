# self review r3 — has-consistent-mechanisms

## the real catch: my ref-route selection DIVERGES from the peer norm

i opened a peer getOne to compare structurally, not just by primitive. `getOneSsoUser.ts:34-47`
INLINES its ref-route selection as an IIFE inside the getOne itself:

```ts
// getOneSsoUser.ts:35 — peer INLINES the route selection
const by = (() => {
  if (!input.by.ref) return input.by;
  if (isRefByUnique({ of: DeclaredAwsSsoUser })(input.by.ref)) return { unique: input.by.ref };
  if (isRefByPrimary({ of: DeclaredAwsSsoUser })(input.by.ref)) return { primary: input.by.ref };
  return UnexpectedCodePathError.throw('ref is neither unique nor primary', { input });
})();
```

my `getOneSsmParameterSecure` does NOT inline this — it calls the EXTRACTED transformer
`asSsmParameterName({ by: input.by })`. so structurally i diverge from the 30-peer inline
habit.

## is the divergence a defect? no — and here is the honest logic

the divergence is deliberate and correct, not an oversight:

1. **it was mandated.** the mech-decode-friction peer reviewer flagged my ORIGINAL inline
   version (an IIFE plus an `arn.replace(/^.*:parameter/, '')` regex) as decode-friction and
   blocked it. i extracted `asSsmParameterName` to clear that blocker. the extract is the fix
   the review demanded.
2. **the peer's inline IIFE would ITSELF fail the decode-friction rule** if reviewed today —
   it is exactly the "IIFE that must be simulated to grok" the rule names. my resource carries
   an extra arn-regex on top, so the friction was even higher, which is why extraction was
   required for mine and not (yet) enforced on the older peer.
3. so i am consistent with the RULE (`rule.forbid.inline-decode-friction` →
   `rule.require.named-transformers`) even where i diverge from the older peer's CODE. when a
   rule and a legacy peer conflict, the rule wins — the peer is simply un-migrated.

**this is a two-reviewer tension i already navigated:** decode-friction demanded extraction;
consistency-with-peers might prefer inline. i settled it toward the rule, because the rule is
the current standard and the peers predate its enforcement. flagged here so a reviewer sees the
tension was conscious, not accidental.

## the rest stays consistent (re-verified, not restated blindly)

- **dao/cast/sdk-wrapper**: `genDeclastructDao`, `assure(...hasReadonly...)`, and the
  one-command-per-file sdk wrappers all match `cloudwatchLogGroup` + sso peers exactly.
- **no duplicated util**: `grep ':parameter'` confirms no extant arn→name parser exists to
  reuse; mine is the sole one.
- **two transformers kept wet**: secure strips arn (DescribeParameters/DeleteParameter act by
  Name); plain passes arn through (GetParameter accepts either). divergent behavior, < 3
  usages → wet per rule.prefer.wet-over-dry.

## verdict

1 conscious structural divergence surfaced (extracted transformer vs peer inline IIFE),
justified by `rule.forbid.inline-decode-friction` and a peer reviewer's explicit blocker. 0
duplicated utilities. the mechanisms are consistent with the current rules; the divergence is
from un-migrated legacy peers, not from the standard.
