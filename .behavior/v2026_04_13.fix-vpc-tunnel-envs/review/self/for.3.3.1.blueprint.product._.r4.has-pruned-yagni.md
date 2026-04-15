# self-review r4: has-pruned-yagni

## YAGNI audit

for each component in the blueprint, check if it was explicitly requested.

### component 1: account field on interface

**requested?** yes — vision line 67: "add account field to DeclaredAwsVpcTunnel"

**minimum viable?** yes — one string field. cannot be simpler.

**extras?** no validation, no transformation, no helper methods.

**holds**: required, minimal

### component 2: account in unique array

**requested?** yes — vision line 22: "resource identity = bastion + cluster + account"

**minimum viable?** yes — add string to array.

**extras?** no custom comparator, no sort order logic.

**holds**: required, minimal

### component 3: getTunnelHash uses input.account

**requested?** yes — criteria usecase.1: "tunnel identity includes account"

**minimum viable?** yes — change source from context to input. one line change.

**extras?** no cache, no fallback logic.

**holds**: required, minimal

### component 4: hash version bump _v

**requested?** no — not in vision or criteria

**question**: did we add this "while we're here"?

**justification**: old cache files used old hash scheme. version bump invalidates old caches cleanly.

**could we skip?** yes — caches would naturally refresh on miss.

**is this YAGNI?** borderline. 1 line change, prevents confusion at rollout.

**decision**: keep — cost is trivial (1 line), benefit is clean rollout.

**flag for wisher?** no — too trivial to escalate.

**holds**: optional but justified

### component 5: castIntoDeclaredAwsVpcTunnel pass-through

**requested?** implied — if account is in unique, cast must pass it through.

**minimum viable?** yes — add one field to output.

**extras?** no validation, no transformation.

**holds**: required, minimal

### component 6: test updates

**requested?** implied — any change requires test coverage.

**minimum viable?**
- add account to instantiation tests
- add account to hash tests
- no new test files (except if cast test doesn't exist)

**extras?** no snapshot tests, no integration tests, no property-based tests.

**holds**: required, minimal

## YAGNI violations found

| component | violation? | action |
|-----------|-----------|--------|
| account field | no | keep |
| account in unique | no | keep |
| hash uses input.account | no | keep |
| version bump _v | borderline | keep (1 line, clean rollout) |
| cast pass-through | no | keep |
| test updates | no | keep |

## what about abstractions?

**did we add abstraction for future flexibility?**
- no AccountId type (just string)
- no AccountValidator class
- no account-related utilities
- no configurable account sources

**holds**: no premature abstraction

## what about optimizations?

**did we optimize before needed?**
- no account cache
- no lazy account lookup
- no account pool

**holds**: no premature optimization

## what about features "while we're here"?

**did we add unrequested features?**
- no audit log
- no account validation
- no account alias support
- no multi-account support
- no account groups

**holds**: no scope creep

## issues found

none. all components are either explicitly requested or minimally justified (version bump).

## what holds

blueprint contains only:
1. requested changes (account field, unique, hash source)
2. necessary consequences (cast pass-through, test updates)
3. one justified convenience (version bump — 1 line, clean rollout)

no YAGNI violations.
