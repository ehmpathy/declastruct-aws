# self-review r3: has-consistent-conventions

## convention consistency check

searched for related codepaths in src/domain.objects/ to identify extant conventions.

### field name conventions

| convention | extant usage | our usage |
|------------|--------------|-----------|
| `account` field name | DeclaredAwsIamUser, ContextAwsApi | used |
| `region` field name | ContextAwsApi.aws.credentials | used |
| account as string | ContextAwsApi.aws.credentials.account | used |
| region as string | ContextAwsApi.aws.credentials.region | used |

**note**: DeclaredAwsIamUser uses `account: RefByPrimary<...>` (object), but VpcTunnel uses `account: string`. this matches the source — ContextAwsApi.aws.credentials uses strings.

### unique key conventions

| pattern | extant examples |
|---------|-----------------|
| single field | `['name']`, `['email']`, `['exid']` |
| composite | `['role', 'name']`, `['instance', 'name']` |
| with account | `['account', 'username']` (DeclaredAwsIamUser) |

our usage: `['account', 'region', 'via', 'into', 'from']` — follows composite pattern.

### jsdoc conventions

| pattern | extant usage | our usage |
|---------|--------------|-----------|
| `.what = ` comment | all domain object fields | used |
| field-level jsdoc | all domain objects | used |

### test fixture conventions

| pattern | extant usage | our usage |
|---------|--------------|-----------|
| account id format | `'123456789012'` (12 digits) | used |
| region format | `'us-east-1'` | used |

## what holds

all conventions match extant patterns:

1. **field names** — `account` and `region` match ContextAwsApi.aws.credentials
2. **field types** — strings match the source (credentials context)
3. **unique keys** — composite pattern consistent with DeclaredAwsIamUser
4. **jsdoc** — `.what =` pattern used throughout
5. **test fixtures** — account id and region format match extant tests
