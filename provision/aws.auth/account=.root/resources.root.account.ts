import { type DomainEntity, RefByPrimary, RefByUnique } from 'domain-objects';

import {
  DeclaredAwsIamPolicyDocument,
  DeclaredAwsIamPolicyStatement,
  DeclaredAwsOrganization,
  DeclaredAwsOrganizationPolicyEligibility,
  DeclaredAwsOrganizationServiceControlPolicy,
  DeclaredAwsOrganizationServiceControlPolicyAttachment,
  getDeclastructAwsProvider,
  getOneOrganization,
} from '../../../src/contract/sdks';
import { log } from '../resources.common';

/**
 * .what = root account resources (scps)
 * .why = org-wide security guardrails that apply to all accounts
 */
export const getResourcesOfRootAccount = async (): Promise<
  DomainEntity<any>[]
> => {
  const provider = await getDeclastructAwsProvider({}, { log });

  // fetch org for attachment target
  const org = await getOneOrganization(
    { by: { auth: true } },
    provider.context,
  );
  if (!org) throw new Error('not in an organization');

  /**
   * .what = enable SCP policy type for org
   * .why = required before create/attach of service control policies
   */
  const scpPolicyEligibility = DeclaredAwsOrganizationPolicyEligibility.as({
    type: 'SERVICE_CONTROL_POLICY',
    choice: 'ENABLED',
  });

  /**
   * .what = deny dangerous exfiltration and audit tamper actions
   * .why = prevents compromised roles from data exfiltration or track cover
   */
  const scpDenyDangerousActions =
    DeclaredAwsOrganizationServiceControlPolicy.as({
      name: 'deny-dangerous-actions',
      description: 'blocks exfiltration, audit tamper, and guardrail escape',
      content: new DeclaredAwsIamPolicyDocument({
        statements: [
          // block exfiltration via snapshot/ami share
          new DeclaredAwsIamPolicyStatement({
            sid: 'DenySnapshotShare',
            effect: 'Deny',
            action: [
              'rds:ModifyDBSnapshotAttribute',
              'rds:ModifyDBClusterSnapshotAttribute',
              'ec2:ModifySnapshotAttribute',
              'ec2:ModifyImageAttribute',
            ],
            resource: '*',
          }),

          // block audit tamper
          new DeclaredAwsIamPolicyStatement({
            sid: 'DenyAuditTamper',
            effect: 'Deny',
            action: [
              'cloudtrail:DeleteTrail',
              'cloudtrail:StopLogging',
              'cloudtrail:UpdateTrail',
              'config:DeleteConfigRule',
              'config:StopConfigurationRecorder',
              'guardduty:DeleteDetector',
            ],
            resource: '*',
          }),

          // block organization escape
          new DeclaredAwsIamPolicyStatement({
            sid: 'DenyOrgEscape',
            effect: 'Deny',
            action: ['organizations:LeaveOrganization'],
            resource: '*',
          }),
        ],
      }),
      tags: {
        managedBy: 'declastruct',
        purpose: 'security-guardrail',
      },
    });

  /**
   * .what = attach deny-dangerous-actions to org root
   * .why = applies to all accounts in the organization
   */
  const scpAttachmentToOrgRoot =
    DeclaredAwsOrganizationServiceControlPolicyAttachment.as({
      policy: RefByUnique.as<
        typeof DeclaredAwsOrganizationServiceControlPolicy
      >({
        name: scpDenyDangerousActions.name,
      }),
      target: RefByPrimary.as<typeof DeclaredAwsOrganization>({ id: org.id }),
    });

  return [scpPolicyEligibility, scpDenyDangerousActions, scpAttachmentToOrgRoot];
};
