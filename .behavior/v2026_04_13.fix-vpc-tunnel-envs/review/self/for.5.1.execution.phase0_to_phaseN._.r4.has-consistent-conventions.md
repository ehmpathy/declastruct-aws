# self-review r4: has-consistent-conventions

## convention consistency check

walked through each name choice in the diff against extant codebase patterns.

searched codebase for related patterns:
- `grep 'castInto|castTo'` — found 86 files with castInto pattern
- `glob src/domain.operations/*/utils/*` — found utils/ folders in lambda, lambdaVersion, vpcTunnel

### name choices reviewed

#### 1. field name: `account`

location: `src/domain.objects/DeclaredAwsVpcTunnel.ts:56`

```typescript
account: string;
```

extant usage check:
- `ContextAwsApi.aws.credentials.account: string` — same pattern
- `DeclaredAwsIamUser.account: RefByPrimary<...>` — different type (object)

**question**: should account be a RefByPrimary like DeclaredAwsIamUser?

**answer**: no. DeclaredAwsIamUser.account references a persisted entity (DeclaredAwsOrganizationAccount). VpcTunnel.account is runtime credentials context — not a reference to a persisted entity. the source is `context.aws.credentials.account` which is a string.

**verdict**: matches source pattern. not divergent.

#### 2. field name: `region`

location: `src/domain.objects/DeclaredAwsVpcTunnel.ts:61`

```typescript
region: string;
```

extant usage check:
- `ContextAwsApi.aws.credentials.region: string` — exact match

**question**: is there a DeclaredAwsRegion entity we should reference?

**answer**: no such entity in codebase. region is a string throughout ContextAwsApi.

**verdict**: matches extant pattern. not divergent.

#### 3. unique key order: `['account', 'region', 'via', 'into', 'from']`

location: `src/domain.objects/DeclaredAwsVpcTunnel.ts:94`

extant patterns:
- `DeclaredAwsIamUser`: `['account', 'username']` — account first
- `DeclaredAwsSsoUser`: `['instance', 'userName']` — scope first, then identifier
- `DeclaredAwsLambdaVersion`: `['lambda', 'codeSha256', 'configSha256']` — parent ref first

**question**: should region come before account?

**answer**: no. AWS convention is account then region (e.g., ARN format: `arn:aws:service:region:account:resource`). however, DeclaredAwsIamUser puts account first. we follow DeclaredAwsIamUser convention.

**verdict**: follows extant DeclaredAwsIamUser pattern. not divergent.

#### 4. jsdoc format: `.what = `

location: `src/domain.objects/DeclaredAwsVpcTunnel.ts:54,59`

```typescript
/**
 * .what = the aws account id whose credentials opened this tunnel
 */
```

extant pattern: all domain object fields use `.what = ` format.

**verdict**: exact match. not divergent.

#### 5. test file name: `castIntoDeclaredAwsVpcTunnel.test.ts`

location: new file

extant pattern check:
- `castIntoDeclaredAwsRdsCluster.test.ts` — exists
- `castIntoDeclaredAwsOrganization.test.ts` — exists
- `castIntoDeclaredAwsIamUser.test.ts` — exists

**verdict**: follows extant castInto test file name pattern. not divergent.

#### 6. utils folder location

location: `src/domain.operations/vpcTunnel/utils/getTunnelHash.ts`

extant pattern:
- `lambda/utils/calcCodeSha256.ts`
- `lambdaVersion/utils/calcConfigSha256.ts`

**verdict**: utils/ folder pattern follows extant usage. not divergent.

#### 7. test fixture values

location: all test files

```typescript
account: '123456789012',
region: 'us-east-1',
```

extant patterns:
- DeclaredAwsIamUser.test.ts: `account: { id: '123456789012' }`
- getMockedAwsApiContext: uses 12-digit account id

**verdict**: 12-digit account id format matches. region format matches AWS conventions. not divergent.

## what holds

all name choices follow extant conventions:

1. **account as string** — matches ContextAwsApi.credentials source (not entity ref)
2. **region as string** — no DeclaredAwsRegion entity; matches credentials source
3. **unique key order** — follows DeclaredAwsIamUser pattern (account first)
4. **jsdoc format** — `.what =` pattern throughout
5. **test file name** — castIntoDeclared*.test.ts pattern followed
6. **utils folder** — follows extant lambda/lambdaVersion pattern
7. **test fixtures** — 12-digit account, standard region format
