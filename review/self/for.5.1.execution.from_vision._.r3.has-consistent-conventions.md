# self review r3 — has-consistent-conventions

## the real catch: a `describe*` verb where the sdk layer uses get/set/del

i read `src/access/sdks/sdkSsm/index.ts` line by line. the extant sdk wrappers use get/set/del
verbs even at the raw i/o boundary:

```ts
export const sdkSsm = {
  getOneParameter,     // wraps GetParameterCommand
  describeOneParameter,// wraps DescribeParametersCommand  ← MINE, a new verb
  setParameter,        // wraps PutParameterCommand
  delParameter,        // wraps DeleteParameterCommand
  execCommand,
};
```

so `describeOneParameter` introduces the verb `describe`, which is NOT in the get/set/gen
canon (`rule.require.get-set-gen-verbs`) and NOT used by any peer in this sdk module. by a
strict name-convention read, this diverges.

## is it a defect? no — the divergence is load-critical for security

i chose `describe` deliberately, and i argue it is the RIGHT choice, not a lapse:

1. **it mirrors AWS's own command** — `DescribeParameters` is metadata-only and never returns
   `Value`; `GetParameter` is the ONLY call that returns/decrypts. the verb split at the sdk
   boundary makes that AWS distinction visible in our names.
2. **it protects the vision's core invariant.** if i had named it `getOneParameter...`, a
   reader (or a future editor) could conflate it with the value-read `getOneParameter` and
   accidentally route a secret through a decrypt path. the distinct verb is a pit-of-success
   guard for "metadata only, no value, no kms:Decrypt" — the whole point of the feature.
3. get/set/gen governs DOMAIN operations; sdk wrappers are communicators that mirror the
   provider api. the peer already bends this (it wraps GetParameter as `getOneParameter`), so
   the sdk layer is a mirror-the-command zone, and `describe` mirrors the command faithfully.

**flagged as a conscious divergence**, not hidden: the verb differs from the get/set/del
sdk-peers, justified because it names a genuinely different AWS operation whose whole value is
that it does NOT read the secret.

## the DOMAIN layer holds the convention

re-checked, not assumed:

- **resource names**: `DeclaredAwsSsmParameterPlain` / `...Secure` follow the
  `DeclaredAws<Service><Resource>` symmetry (rule.require.symmetry-with-peer-resources); the
  Plain/Secure suffix split is the vision's prescribed shape.
- **domain ops**: `getOneSsmParameterSecure`, `setSsmParameterSecure`,
  `castIntoDeclaredAwsSsmParameterSecure`, `delSsmParameterSecure` — get/set/cast/del, exactly
  the peer verb set.
- **transformers**: `asSsmParameterName`, `asSsmParameterIdentifier` — the `as*` prefix per
  rule.require.named-transformers.
- **no new domain terms**: i reused `value`, `keyId`, `arn`, `version`, `tags` — no synonym
  minted (rule.require.ubiqlang).

## verdict

1 conscious convention divergence surfaced: the sdk wrapper `describeOneParameter` uses a
`describe` verb absent from the get/set/del sdk-peers — justified because it mirrors AWS's
metadata-only command and keeps the no-value/no-decrypt boundary legible. 0 divergences at the
domain-name layer; names, prefixes, and structure match peers.
