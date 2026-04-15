# self-review r3: has-questioned-assumptions

## hidden technical assumptions

### assumption 1: account is always a string

**what we assume**: account is `string`, not `string | null` or `number`

**what if opposite were true?**: if account were null, tunnel identity would be ambiguous. if number, we'd need string conversion.

**evidence**: AWS account IDs are always 12-digit strings. never null in valid credentials. the research showed `context.aws.credentials.account` is always present.

**holds?** yes — AWS guarantees account is 12-digit string

### assumption 2: account should be first in unique array

**what we assume**: `unique = ['account', 'via', 'into', 'from']` — account first

**what if opposite were true?**: order in unique array does not affect identity comparison. declastruct treats unique as a set for comparison purposes.

**evidence**: domain-objects uses unique keys as a set. order is for human readability only.

**could simpler approach work?**: yes, any order works. "account first" is emphasis, not requirement.

**holds?** yes — order is cosmetic, chosen for clarity

### assumption 3: hash version bump is necessary

**what we assume**: `_v` changes from `v2025_11_27` to `v2026_04_13` to invalidate old cache

**what if opposite were true?**: if we skip version bump, old cache files remain valid. new declarations compute different hash (because account source changed). result: cache miss, not cache collision.

**is this based on evidence or habit?**: habit. cache miss is not harmful, just wasteful.

**could simpler approach work?**: yes, skip version bump. caches will naturally refresh.

**decision**: keep version bump. 1 line change, clearer intent, no downside.

**holds?** yes — but noted as optional optimization

### assumption 4: region should stay from context

**what we assume**: region comes from `context.aws.credentials.region`, not from domain object

**what if opposite were true?**: if region were in domain object, we'd need to pass it everywhere. but region is implicit in AWS credentials — you don't "choose" a region for a tunnel, you inherit it from your session.

**evidence**: the vision explicitly chose "explicit account" (option 1) but did not mention region. region is session-scoped, not resource-scoped.

**could simpler approach work?**: region in domain object would complicate the interface without benefit.

**holds?** yes — region is session context, not resource identity

### assumption 5: RefByUnique will include account

**what we assume**: after account joins unique, `RefByUnique<DeclaredAwsVpcTunnel>` will require account

**what if opposite were true?**: if domain-objects computed RefByUnique differently, our assumption would break.

**evidence**: domain-objects computes RefByUnique from `public static unique`. account in unique array means RefByUnique will require account. this is how the library works.

**holds?** yes — domain-objects library behavior is documented

### assumption 6: castIntoDeclaredAwsVpcTunnel receives account in unique

**what we assume**: the cast function receives account as part of `input.unique`

**what if opposite were true?**: if caller didn't pass account, typescript would error because RefByUnique requires it.

**evidence**: typescript enforces required fields. RefByUnique<DeclaredAwsVpcTunnel> will require account after account joins unique.

**holds?** yes — typescript enforcement

### assumption 7: consumers will update to pass account

**what we assume**: consumers (like declapract-typescript-ehmpathy) will update their code

**what if opposite were true?**: if consumers don't update, typescript will error at their compile time.

**is this architecture choice based on evidence or habit?**: evidence. break changes force consumer updates. this is intentional — the vision noted "break: consumers must pass account".

**holds?** yes — break change is intentional

## what holds

all assumptions are valid:

| assumption | based on | holds |
|------------|----------|-------|
| account is string | AWS spec | yes |
| account first in unique | readability | yes (order cosmetic) |
| hash version bump | habit | yes (optional but clean) |
| region from context | session scope | yes |
| RefByUnique includes account | library behavior | yes |
| cast receives account | typescript | yes |
| consumers update | intentional break | yes |

## issues found

none. all assumptions are grounded in evidence or documented as intentional choices.
