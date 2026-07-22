import type { UniDateTime } from '@ehmpathy/uni-time';
import { DomainEntity } from 'domain-objects';

import { DeclaredAwsTags } from './DeclaredAwsTags';

/**
 * .what = a declarative structure that represents a secret AWS SSM Parameter (type=SecureString)
 * .why = enables declarative management of secrets in Parameter Store with maximum security
 *
 * .identity
 *   - @primary = [arn] — assigned by aws on creation
 *   - @unique = [name] — parameter names are unique within an aws account+region
 *
 * WRITE-ONLY PATTERN (replicates DeclaredGithubOrgSecret):
 *   - the value is @writeonly — it is NEVER read back; the cast sets value=undefined
 *   - on read: only metadata (via DescribeParameters + ListTagsForResource — no
 *     GetParameter, no kms:Decrypt; both calls are metadata-only)
 *   - if value is undefined: the extant secret's VALUE is kept unchanged (shows KEEP)
 *   - if value is provided: the secret is created/rotated with the new value
 *   - no secret-derived artifact (hash/salt) is ever published, so none can leak
 *   - value-content drift is intentionally NOT detected — this is the deliberate trade of
 *     zero attack-surface over drift detection (see the vision's core design decision)
 *   - description + keyId are roundtrip read-write, but aws re-encrypts a SecureString only on
 *     a PutParameter (which needs the value); so a change to either requires a supplied value
 *   - tags are independently mutable (AddTagsToResource needs no value)
 *   - tier is omitted from v1 (add-when-needed)
 */
export interface DeclaredAwsSsmParameterSecure {
  /**
   * .what = the arn of the parameter
   * .note = @metadata — assigned by aws
   */
  arn?: string;

  /**
   * .what = the fully qualified name (path) of the parameter
   * .note = @unique
   * .example = '/svc-notifications/prod/twilio/auth-token'
   */
  name: string;

  /**
   * .what = the secret value to write
   * .note = @writeonly — undefined = keep extant; present = create/rotate. NEVER read back.
   */
  value?: string;

  /**
   * .what = the kms key id/alias used to encrypt the SecureString
   * .note = roundtrip read-write; null = the account default aws/ssm key. a change to this
   *   requires a supplied `value` (aws re-encrypts a SecureString only on a value write)
   * .note = in-place key rotation (a new non-default keyId + a value) is not yet proven against
   *   live aws — every test uses the default key (keyId: null), since a non-default CMK is not
   *   provisioned in the test account. the value-undefined guard arm IS tested (it throws before
   *   any aws call); the live re-encrypt path is deferred until a test CMK exists, same as the
   *   tag-write grant story (rule.prefer.wet-over-dry)
   */
  keyId: string | null;

  /**
   * .what = an optional human description of the parameter
   * .note = roundtrip read-write — read via DescribeParameters (metadata only, no value); a
   *   change requires a supplied `value` (aws writes a SecureString description only on Put);
   *   null = no description
   */
  description: string | null;

  /**
   * .what = the tags applied to the parameter
   * .note = roundtrip read-write — read via ListTagsForResource (metadata only, no value),
   *   written via AddTagsToResource/RemoveTagsFromResource (no value needed); null = no tags
   */
  tags: DeclaredAwsTags | null;

  /**
   * .what = the parameter version
   * .note = @readonly — assigned by aws, increments on each write
   */
  version?: number;

  /**
   * .what = when the parameter was last modified
   * .note = @readonly — assigned by aws
   */
  lastModifiedAt?: UniDateTime;
}

export class DeclaredAwsSsmParameterSecure
  extends DomainEntity<DeclaredAwsSsmParameterSecure>
  implements DeclaredAwsSsmParameterSecure
{
  /**
   * .what = arn is the primary key assigned by aws
   */
  public static primary = ['arn'] as const;

  /**
   * .what = parameter name (path) is unique within the aws account+region
   */
  public static unique = ['name'] as const;

  /**
   * .what = identity attributes assigned by aws
   */
  public static metadata = ['arn'] as const;

  /**
   * .what = the value is write-only — set on write, never read back
   */
  public static writeonly = ['value'] as const;

  /**
   * .what = intrinsic attributes resolved from aws, not user-settable
   */
  public static readonly = ['version', 'lastModifiedAt'] as const;

  /**
   * .what = nested domain object definitions
   */
  public static nested = {
    tags: DeclaredAwsTags,
  };
}
