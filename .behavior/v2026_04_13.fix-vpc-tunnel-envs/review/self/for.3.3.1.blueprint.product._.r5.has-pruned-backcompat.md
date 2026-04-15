# self-review r5: has-pruned-backcompat

## backwards compatibility audit

the blueprint explicitly declares a **break**:
> "**break**: consumers must now pass `account` when they declare a tunnel."

this is NOT a backwards-compatible change. the vision chose this deliberately.

### did we add any backwards compat shims?

| potential shim | present? | evidence |
|----------------|----------|----------|
| account?: string (optional field) | no | account is required string |
| fallback to context.aws.credentials.account | no | hash uses input.for.tunnel.account |
| old unique keys as alias | no | unique changed to include account |
| old hash version support | no | version bumped to v2026_04_13 |
| migration helper | no | none in blueprint |

### backwards compat concerns in blueprint

**found**: none.

the blueprint deliberately breaks:
1. consumers must add `account` field
2. old cache files will be invalidated
3. no fallback paths

### did we assume backwards compat "to be safe"?

**question**: should account be optional with fallback to context?

**answer**: no — the vision explicitly chose option 1 (explicit account) over option 2 (context-aware). wisher confirmed.

**question**: should old hash files remain valid?

**answer**: no — hash version bump is deliberate. old files should not match new declarations.

### open questions for wisher

**none**. the break is explicitly requested.

from vision:
- line 67: "add account field to DeclaredAwsVpcTunnel"
- line 76: consumer must add `account: config.aws.account`
- summary: "break: consumers must now pass `account`"

wisher chose explicit break over backwards compatibility.

## what holds

no backwards compat shims in blueprint. the break is:
1. explicitly requested by wisher
2. documented in vision
3. necessary for the fix to work

backwards compat would undermine the fix.

## issues found

none. no backwards compat was added that wasn't requested. in fact, no backwards compat was requested at all — the change is a deliberate break.
