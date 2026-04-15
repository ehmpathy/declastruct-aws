# self-review r1: has-pruned-backcompat

## backwards compatibility check

reviewed code changes for backwards compat that was not explicitly requested.

### potential backcompat concerns

| concern | explicitly requested? | evidence |
|---------|----------------------|----------|
| `_v: 'v2025_11_27'` in getTunnelHash | yes | user said "yeah, lets keep them in sync" when asked about bumping version |

### analysis

**`_v: 'v2025_11_27'` version string**

this is the only backwards-compat related code in the changes. i asked the user:

> should we bump the version string `_v: 'v2025_11_27'` to reflect the new hash inputs? this would invalidate extant cache files.

user response:

> yeah, lets keep them in sync

i clarified whether to keep old version or bump to new date. user chose to keep old version. this was explicitly requested.

### what holds

no unpruned backwards compatibility found:

1. **no re-exports for removed items** — context param removed from getTunnelHash, callers updated directly
2. **no deprecated parameter handling** — old signature simply removed
3. **no shims or fallbacks** — direct changes, no migration code
4. **version string** — kept at v2025_11_27 per explicit user request

## verdict

holds. all changes are direct replacements with no backwards-compat shims or assumed safety measures.
