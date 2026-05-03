import {
  DomainEntity,
  type Ref,
  RefByPrimary,
  RefByUnique,
} from 'domain-objects';

import type { DeclaredAwsOrganization } from './DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationServiceControlPolicy } from './DeclaredAwsOrganizationServiceControlPolicy';

/**
 * .what = target for SCP attachment (org or account)
 * .note
 *   - org: Ref<DeclaredAwsOrganization> — applies to ALL accounts via root
 *   - account: Ref<DeclaredAwsOrganizationAccount> — applies to single account
 */
export type ServiceControlPolicyAttachmentTarget =
  | Ref<typeof DeclaredAwsOrganization>
  | Ref<typeof DeclaredAwsOrganizationAccount>;

/**
 * .what = an attachment of an SCP to an organization root or account
 * .why = applies the SCP guardrails to all principals within the target
 *
 * .identity
 *   - @unique = [policy, target] composite — the attachment is uniquely identified by policy + target
 *   - no @primary — attachments do not have an arn
 *
 * .note
 *   - target can be org root (rootId) or account (id/email)
 *   - org root attachment applies to ALL accounts in org
 *   - SCPs are inherited: root → ou → account (cumulative intersection)
 *   - the management account is exempt from SCPs even when attached
 *   - you can attach the same policy to multiple targets
 *   - you can attach multiple policies to the same target
 *   - OU support deferred (requires DeclaredAwsOrganizationUnit)
 *
 * @see https://docs.aws.amazon.com/organizations/latest/APIReference/API_AttachPolicy.html
 */
export interface DeclaredAwsOrganizationServiceControlPolicyAttachment {
  /**
   * .what = reference to the SCP to attach
   * .note = referenced by unique (name) for declarative definition
   */
  policy: RefByUnique<typeof DeclaredAwsOrganizationServiceControlPolicy>;

  /**
   * .what = reference to the target (org or account)
   * .note
   *   - org: { id: 'o-xxx' } — applies to all accounts via root
   *   - account: { id: '123...' } or { email: '...' }
   */
  target: ServiceControlPolicyAttachmentTarget;
}

/**
 * .note = semantically a DomainLiteral (relationship without lifecycle), but extends
 *         DomainEntity for DAO infrastructure compatibility. has no primary key.
 */
export class DeclaredAwsOrganizationServiceControlPolicyAttachment
  extends DomainEntity<DeclaredAwsOrganizationServiceControlPolicyAttachment>
  implements DeclaredAwsOrganizationServiceControlPolicyAttachment
{
  /**
   * .what = unique by policy + target combination
   * .note = a policy can only be attached once per target
   */
  public static unique = ['policy', 'target'] as const;

  /**
   * .what = no metadata — attachments have no aws-assigned identity
   */
  public static metadata = [] as const;

  /**
   * .what = no readonly fields — all fields are user-defined
   */
  public static readonly = [] as const;

  /**
   * .what = nested domain object definitions
   * .note = target is union: org ref or account ref
   */
  public static nested = {
    policy: RefByUnique<typeof DeclaredAwsOrganizationServiceControlPolicy>,
    target: [RefByPrimary, RefByUnique],
  };
}
