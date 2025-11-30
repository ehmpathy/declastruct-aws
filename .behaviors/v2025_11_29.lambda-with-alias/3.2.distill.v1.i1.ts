/**
 * .what = domain objects distillation for lambda + alias deployment
 * .why = enables declarative lambda deployment with versions and aliases per the wish
 *
 * .context
 *   - wish: deploy lambdas via declastruct with alias qualifiers (expect=LIVE|IDLE, commit=$hash, pr=XYZ)
 *   - research: aws lambda has function → version → alias hierarchy; aliases are named pointers to versions
 *
 * .key-insights
 *   - lambdas are identified by name (unique within region+account)
 *   - versions are immutable snapshots, identified by (functionName, codeSha256, configSha256) composite
 *   - aliases are named pointers to versions, identified by (functionName, aliasName) composite
 *   - iam roles are identified by name (unique within account)
 *   - iam role inline policies are identified by (roleName, policyName) composite
 *
 * .refs
 *   - research v1: .behaviors/v2025_11_29.lambda-with-alias/3.1.research.v1.i1.md
 *   - research v2: .behaviors/v2025_11_29.lambda-with-alias/3.1.research.v2.i1.md
 */
import { Runtime } from '@aws-sdk/client-lambda';
import { DomainEntity, DomainLiteral, RefByUnique } from 'domain-objects';

// ============================================================================
// DeclaredAwsIamPolicyStatement
// ============================================================================

/**
 * .what = an iam policy statement (permission rule)
 * .why = defines a single allow/deny rule within an iam policy document
 *
 * .note
 *   - used both in inline role policies and trust policies
 *   - this is a literal (value object) since it has no identity — just shape
 */
/**
 * .what = principal specification for trust policies
 * .why = defines who can assume a role or access a resource
 */
export interface DeclaredAwsIamPrincipal {
  /**
   * .what = aws account, user, or role arns
   * .example = 'arn:aws:iam::123456789012:root' or '*'
   */
  AWS?: string | string[];

  /**
   * .what = aws service principals
   * .example = 'lambda.amazonaws.com'
   */
  Service?: string | string[];

  /**
   * .what = federated identity provider arns
   * .example = 'arn:aws:iam::123456789012:saml-provider/MyProvider'
   */
  Federated?: string | string[];
}

export interface DeclaredAwsIamPolicyStatement {
  /**
   * .what = optional identifier for the statement
   * .note = useful for documentation and debugging
   */
  sid?: string;

  /**
   * .what = whether this statement allows or denies the actions
   */
  effect: 'Allow' | 'Deny';

  /**
   * .what = the principal this statement applies to
   * .note = required for trust policies; omit for permission policies
   * .example = { Service: 'lambda.amazonaws.com' } or '*'
   */
  principal?: '*' | DeclaredAwsIamPrincipal;

  /**
   * .what = the actions this statement applies to
   * .example = 's3:GetObject' or ['s3:GetObject', 's3:PutObject']
   */
  action: string | string[];

  /**
   * .what = the resources this statement applies to
   * .example = 'arn:aws:s3:::bucket/*' or '*'
   */
  resource: string | string[];

  /**
   * .what = optional conditions for when this statement applies
   * .note = structured as { operator: { key: value } }
   */
  condition?: Record<string, Record<string, string | string[]>>;
}
export class DeclaredAwsIamPolicyStatement
  extends DomainLiteral<DeclaredAwsIamPolicyStatement>
  implements DeclaredAwsIamPolicyStatement {}

// ============================================================================
// DeclaredAwsIamRole
// ============================================================================

/**
 * .what = an iam role for lambda execution
 * .why = defines the identity and permissions a lambda assumes at runtime
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — role names are unique within an aws account
 *
 * .note
 *   - the trust policy defines who can assume this role (e.g., lambda.amazonaws.com)
 *   - permissions are granted via attached policies (inline or managed)
 */
export interface DeclaredAwsIamRole {
  /**
   * .what = the arn of the role
   * .note = @metadata — assigned by aws on creation
   */
  arn?: string;

  /**
   * .what = the name of the role
   * .note = @unique — unique within the aws account
   */
  name: string;

  /**
   * .what = optional organizational path for the role
   * .default = '/'
   */
  path?: string;

  /**
   * .what = optional description of the role's purpose
   */
  description?: string;

  /**
   * .what = the trust policy defining who can assume this role
   * .why = supports all trust relationships: services, cross-account, federated, conditional
   * .note
   *   - for lambda execution roles: [{ effect: 'Allow', action: 'sts:AssumeRole', resource: '*', principal: { Service: 'lambda.amazonaws.com' } }]
   *   - factories can simplify common patterns (e.g., assumableByService('lambda.amazonaws.com'))
   */
  policies: DeclaredAwsIamPolicyStatement[];

  /**
   * .what = optional tags for the role
   */
  tags?: Record<string, string>;
}
export class DeclaredAwsIamRole
  extends DomainEntity<DeclaredAwsIamRole>
  implements DeclaredAwsIamRole
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = role name is unique within the aws account
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — all fields are either metadata or user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    policies: DeclaredAwsIamPolicyStatement,
  };
}

// ============================================================================
// DeclaredAwsIamRolePolicy
// ============================================================================

/**
 * .what = an inline policy attached to an iam role
 * .why = grants permissions to the role for specific aws actions
 *
 * .identity
 *   - @unique = [role, name] composite — the inline policy is uniquely identified by role + policy name
 *   - no @primary — inline policies do not have an arn
 *
 * .note
 *   - inline policies are embedded in the role, not standalone managed policies
 *   - the roleName is required for identity but comes from the parent role reference
 */
export interface DeclaredAwsIamRolePolicy {
  /**
   * .what = the name of this inline policy
   * .note = unique within the role, not globally
   */
  name: string;

  /**
   * .what = reference to the role this policy is attached to
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * .what = the permission statements in this policy
   */
  statements: DeclaredAwsIamPolicyStatement[];
}
export class DeclaredAwsIamRolePolicy
  extends DomainEntity<DeclaredAwsIamRolePolicy>
  implements DeclaredAwsIamRolePolicy
{
  /**
   * .what = unique within the role, identified by role reference + policy name
   * .note
   *   - inline policies have no arn, so no primary key
   *   - identity is established via the composite unique key
   */
  public static unique = ['role', 'name'] as const;

  /**
   * .what = no metadata — inline policies have no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    role: DeclaredAwsIamRole,
    statements: DeclaredAwsIamPolicyStatement,
  };
}

// ============================================================================
// DeclaredAwsLambda
// ============================================================================

/**
 * .what = a lambda function declaration (the $LATEST mutable version)
 * .why = defines the function's code and configuration that can be published as immutable versions
 *
 * .identity
 *   - @primary = [arn] — assigned by aws; for $LATEST this is unqualified arn
 *   - @unique = [name] — function names are unique within region+account
 *
 * .note
 *   - this represents $LATEST — the mutable working copy that receives code/config updates
 *   - published versions are immutable snapshots created from $LATEST
 *   - the arn for $LATEST does not include a qualifier suffix
 */
export interface DeclaredAwsLambda {
  /**
   * .what = the arn of the lambda function
   * .note = @metadata — assigned by aws; unqualified arn for $LATEST
   */
  arn?: string;

  /**
   * .what = the name of the lambda function
   * .note = @unique — unique within region+account
   */
  name: string;

  /**
   * .what = reference to the execution role
   */
  role: RefByUnique<typeof DeclaredAwsIamRole>;

  /**
   * .what = the runtime environment
   * .example = 'nodejs20.x', 'python3.12'
   */
  runtime: Runtime;

  /**
   * .what = the entry point handler
   * .example = 'dist/index.handler'
   */
  handler: string;

  /**
   * .what = the path to the deployment package
   * .note = local path or s3 uri to the zip file
   */
  codeZipUri: string;

  /**
   * .what = the sha256 hash of the deployment package
   * .note = @readonly — computed from the zip contents
   */
  codeSha256?: string;

  /**
   * .what = the size of the deployment package in bytes
   * .note = @readonly — computed from the zip contents
   */
  codeSize?: number;

  /**
   * .what = max execution time in seconds
   * .default = 3
   * .max = 900
   */
  timeout: number;

  /**
   * .what = memory allocation in MB
   * .default = 128
   * .max = 10240
   */
  memory: number;

  /**
   * .what = environment variables available at runtime
   */
  envars: Record<string, string>;

  /**
   * .what = optional description
   */
  description?: string;

  /**
   * .what = optional tags for the function
   * .note = tags apply at function-level only, not to versions or aliases
   */
  tags?: Record<string, string>;

  /**
   * .what = when the function was last modified
   * .note = @readonly — assigned by aws
   */
  updatedAt?: string;
}
export class DeclaredAwsLambda
  extends DomainEntity<DeclaredAwsLambda>
  implements DeclaredAwsLambda
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = function name is unique within region+account
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn', 'updatedAt'] as const;

  /**
   * .what = intrinsic attributes computed/resolved from aws, not user-settable
   */
  public static readonly = ['codeSha256', 'codeSize'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    role: DeclaredAwsIamRole,
  };
}

// ============================================================================
// DeclaredAwsLambdaVersion
// ============================================================================

/**
 * .what = an immutable version of a lambda function
 * .why = represents a published snapshot that can be referenced by aliases
 *
 * .identity
 *   - @primary = [arn] — qualified arn including version number (e.g., :5)
 *   - @unique = [lambda, codeSha256, configSha256] — a version is uniquely identified by function + code + config fingerprint
 *
 * .note
 *   - versions are immutable — once published, they cannot be modified
 *   - the version number is assigned sequentially by aws and never reused
 *   - PublishVersion is idempotent — if code+config unchanged, returns existing version
 *   - configSha256 is computed by declastruct since aws does not expose it
 */
export interface DeclaredAwsLambdaVersion {
  /**
   * .what = the qualified arn of the version
   * .note = @metadata — assigned by aws; includes version number suffix
   * .example = 'arn:aws:lambda:us-east-1:123456789012:function:my-func:5'
   */
  arn?: string;

  /**
   * .what = the numeric version identifier
   * .note = @readonly — assigned sequentially by aws (e.g., '1', '2', '3')
   */
  version?: string;

  /**
   * .what = reference to the parent lambda function
   */
  lambda: RefByUnique<typeof DeclaredAwsLambda>;

  /**
   * .what = the sha256 hash of the code at publish time
   * .note = part of the unique key — same code = same hash
   */
  codeSha256: string;

  /**
   * .what = the sha256 hash of the config at publish time
   * .note
   *   - computed by declastruct (aws does not expose this)
   *   - includes: handler, runtime, memory, timeout, envars, role, vpc, layers, etc.
   *   - part of the unique key — same config = same hash
   */
  configSha256: string;

  /**
   * .what = optional description for this version
   * .note = 0-256 chars; the only writable field on PublishVersion
   */
  description?: string | null;
}
export class DeclaredAwsLambdaVersion
  extends DomainEntity<DeclaredAwsLambdaVersion>
  implements DeclaredAwsLambdaVersion
{
  /**
   * .what = qualified arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = version is uniquely identified by function + code + config fingerprint
   * .note = this enables idempotent version lookup — find existing version by content hash
   */
  public static unique = ['lambda', 'codeSha256', 'configSha256'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = version number is assigned by aws, not user-settable
   */
  public static readonly = ['version'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    lambda: DeclaredAwsLambda,
  };
}

// ============================================================================
// DeclaredAwsLambdaAlias
// ============================================================================

/**
 * .what = a named pointer to a lambda version
 * .why = enables stable endpoints that can be updated to point to different versions
 *
 * .identity
 *   - @primary = [arn] — qualified arn including alias name (e.g., :LIVE)
 *   - @unique = [lambda, name] — alias name is unique per function
 *
 * .note
 *   - aliases are mutable — they can be retargeted to different versions
 *   - multiple aliases can point to the same version (key for the wish)
 *   - alias names cannot be purely numeric (to avoid confusion with version numbers)
 *   - alias names: 1-128 chars, pattern: (?!^[0-9]+$)([a-zA-Z0-9-_]+)
 *
 * .wish-mapping
 *   - expect=LIVE → alias name 'expect-LIVE'
 *   - expect=IDLE → alias name 'expect-IDLE'
 *   - commit=$hash → alias name 'commit-abc1234'
 *   - pr=XYZ → alias name 'pr-42'
 */
export interface DeclaredAwsLambdaAlias {
  /**
   * .what = the qualified arn of the alias
   * .note = @metadata — assigned by aws; includes alias name suffix
   * .example = 'arn:aws:lambda:us-east-1:123456789012:function:my-func:LIVE'
   */
  arn?: string;

  /**
   * .what = the alias name
   * .note = @unique(composite: lambda + name) — unique per function
   * .constraint = 1-128 chars, cannot be purely numeric
   */
  name: string;

  /**
   * .what = reference to the parent lambda function
   */
  lambda: RefByUnique<typeof DeclaredAwsLambda>;

  /**
   * .what = reference to the version this alias points to
   */
  version: RefByUnique<typeof DeclaredAwsLambdaVersion>;

  /**
   * .what = optional description
   */
  description?: string;

  /**
   * .what = optional traffic routing configuration for weighted deployments
   * .note = enables canary/blue-green deployments by splitting traffic between versions
   */
  routingConfig?: {
    /**
     * .what = additional versions to route traffic to
     * .format = { versionNumber: weight } where weight is 0.0-1.0
     * .example = { '6': 0.1 } → 10% to version 6, 90% to primary version
     */
    additionalVersionWeights?: Record<string, number>;
  };
}
export class DeclaredAwsLambdaAlias
  extends DomainEntity<DeclaredAwsLambdaAlias>
  implements DeclaredAwsLambdaAlias
{
  /**
   * .what = qualified arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = alias is uniquely identified by function + alias name
   */
  public static unique = ['lambda', 'name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = no readonly fields — version and routingConfig are user-updatable
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    lambda: DeclaredAwsLambda,
    version: DeclaredAwsLambdaVersion,
  };
}

// ============================================================================
// usage example (from vision)
// ============================================================================

/**
 * .what = example usage demonstrating the wish fulfillment
 * .note = this is illustrative, not executable in this file
 *
 * ```ts
 * const role = new DeclaredAwsIamRole({
 *   name: 'svc-home-services.dev.execution-role',
 *   description: 'execution role for svc-home-services in dev',
 *   policies: [
 *     { effect: 'Allow', principal: { Service: 'lambda.amazonaws.com' }, action: 'sts:AssumeRole', resource: '*' },
 *   ],
 * });
 *
 * const rolePolicy = new DeclaredAwsIamRolePolicy({
 *   name: 'permissions',
 *   role: RefByUnique.as<typeof DeclaredAwsIamRole>(role),
 *   statements: [
 *     { effect: 'Allow', action: 'ssm:GetParameters', resource: 'arn:aws:ssm:*:*:parameter/*' },
 *     { effect: 'Allow', action: ['lambda:InvokeFunction', 'lambda:InvokeAsync'], resource: '*' },
 *   ],
 * });
 *
 * const lambda = new DeclaredAwsLambda({
 *   name: 'svc-home-services.dev.getServiceBySlug',
 *   role: RefByUnique.as<typeof DeclaredAwsIamRole>(role),
 *   runtime: 'nodejs20.x',
 *   handler: 'dist/contract/apis/getServiceBySlug.handler',
 *   codeZipUri: '.artifact/contents.zip',
 *   timeout: 30,
 *   memory: 1024,
 *   envars: {
 *     TZ: 'UTC',
 *     NODE_ENV: 'production',
 *   },
 *   tags: { organization: 'ahbode', project: 'svc-home-services' },
 * });
 *
 * const version = new DeclaredAwsLambdaVersion({
 *   lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
 *   codeSha256: calcCodeSha256({ of: lambda }),
 *   configSha256: calcConfigSha256({ of: lambda }),
 *   description: null,
 * });
 *
 * const aliasLive = new DeclaredAwsLambdaAlias({
 *   name: 'expect-LIVE',
 *   lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
 *   version: RefByUnique.as<typeof DeclaredAwsLambdaVersion>(version),
 * });
 *
 * const aliasCommit = new DeclaredAwsLambdaAlias({
 *   name: 'commit-abc1234',
 *   lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
 *   version: RefByUnique.as<typeof DeclaredAwsLambdaVersion>(version),
 * });
 *
 * const aliasPr = new DeclaredAwsLambdaAlias({
 *   name: 'pr-42',
 *   lambda: RefByUnique.as<typeof DeclaredAwsLambda>(lambda),
 *   version: RefByUnique.as<typeof DeclaredAwsLambdaVersion>(version),
 * });
 * ```
 */
