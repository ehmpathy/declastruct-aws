import { UnexpectedCodePathError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import {
  DeclaredAwsIamPolicyBundle,
  DeclaredAwsIamPolicyDocument,
  DeclaredAwsIamPolicyStatement,
} from '../../src/contract/sdks';

export const log = genLogMethods();

/**
 * .what = lazy getters for SSO env vars
 * .why = only needed for root account SSO resources, not demo OIDC
 */
export const getOneSsoAdminUsername = (): string =>
  process.env.SSO_ADMIN_USERNAME ??
  UnexpectedCodePathError.throw(
    'dont forget to declare the SSO_ADMIN_USERNAME. not checked in',
  );
export const getOneSsoAdminEmail = (): string =>
  process.env.SSO_ADMIN_EMAIL ??
  UnexpectedCodePathError.throw(
    'dont forget to declare the SSO_ADMIN_EMAIL. not checked in',
  );
export const getOneSsoDemoEmail = (): string =>
  process.env.SSO_DEMO_EMAIL ??
  UnexpectedCodePathError.throw(
    'dont forget to declare the SSO_DEMO_EMAIL. not checked in',
  );

/**
 * .what = shared demo permissions policy
 * .why = single source of truth for demo access permissions
 * .note = reused by both SSO permission set and OIDC role
 */
export const demoPermissionsPolicy: DeclaredAwsIamPolicyBundle =
  DeclaredAwsIamPolicyBundle.as({
    managed: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
    inline: new DeclaredAwsIamPolicyDocument({
      statements: [
        // S3: read/write
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
          resource: '*',
        }),
        // Lambda: full access
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'lambda:CreateFunction',
            'lambda:UpdateFunctionCode',
            'lambda:UpdateFunctionConfiguration',
            'lambda:DeleteFunction',
            'lambda:InvokeFunction',
            'lambda:PublishVersion',
            'lambda:CreateAlias',
            'lambda:UpdateAlias',
            'lambda:DeleteAlias',
            'lambda:TagResource',
            'lambda:UntagResource',
          ],
          resource: '*',
        }),
        // IAM Roles: full access
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'iam:CreateRole',
            'iam:UpdateRole',
            'iam:DeleteRole',
            'iam:UpdateAssumeRolePolicy',
            'iam:TagRole',
            'iam:UntagRole',
            'iam:PutRolePolicy',
            'iam:DeleteRolePolicy',
            'iam:AttachRolePolicy',
            'iam:DetachRolePolicy',
            'iam:PassRole',
          ],
          resource: '*',
        }),
        // IAM Policies: full access
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'iam:CreatePolicy',
            'iam:DeletePolicy',
            'iam:CreatePolicyVersion',
            'iam:DeletePolicyVersion',
            'iam:SetDefaultPolicyVersion',
            'iam:TagPolicy',
            'iam:UntagPolicy',
          ],
          resource: '*',
        }),
        // IAM User Access Keys: create/delete
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'iam:CreateAccessKey',
            'iam:DeleteAccessKey',
            'iam:UpdateAccessKey',
          ],
          resource: '*',
        }),
        // IAM OIDC Providers: full access
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'iam:CreateOpenIDConnectProvider',
            'iam:UpdateOpenIDConnectProviderThumbprint',
            'iam:DeleteOpenIDConnectProvider',
            'iam:AddClientIDToOpenIDConnectProvider',
            'iam:RemoveClientIDFromOpenIDConnectProvider',
            'iam:TagOpenIDConnectProvider',
            'iam:UntagOpenIDConnectProvider',
          ],
          resource: '*',
        }),
        // IAM Instance Profiles: full access (required for EC2 IAM role assignment)
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'iam:CreateInstanceProfile',
            'iam:DeleteInstanceProfile',
            'iam:AddRoleToInstanceProfile',
            'iam:RemoveRoleFromInstanceProfile',
            'iam:GetInstanceProfile',
            'iam:TagInstanceProfile',
            'iam:UntagInstanceProfile',
          ],
          resource: '*',
        }),
        // CloudWatch Logs: full access
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:GetLogEvents',
            'logs:DeleteLogGroup',
            'logs:PutRetentionPolicy',
            'logs:DeleteRetentionPolicy',
            'logs:TagLogGroup',
            'logs:UntagLogGroup',
            'logs:TagResource',
            'logs:UntagResource',
          ],
          resource: '*',
        }),
        // EC2: instance lifecycle (start/stop/hibernate)
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:RunInstances',
            'ec2:StartInstances',
            'ec2:StopInstances',
            'ec2:TerminateInstances',
            'ec2:RebootInstances',
            'ec2:ModifyInstanceAttribute',
            'ec2:CreateTags',
            'ec2:DeleteTags',
          ],
          resource: '*',
        }),
        // EC2: network interfaces (required for RunInstances)
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:CreateNetworkInterface',
            'ec2:DeleteNetworkInterface',
            'ec2:ModifyNetworkInterfaceAttribute',
            'ec2:AttachNetworkInterface',
            'ec2:DetachNetworkInterface',
            'ec2:AssignPrivateIpAddresses',
            'ec2:UnassignPrivateIpAddresses',
          ],
          resource: '*',
        }),
        // EC2: EBS volumes (required for instances)
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:CreateVolume',
            'ec2:DeleteVolume',
            'ec2:AttachVolume',
            'ec2:DetachVolume',
            'ec2:ModifyVolume',
          ],
          resource: '*',
        }),
        // EC2: launch templates
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:CreateLaunchTemplate',
            'ec2:CreateLaunchTemplateVersion',
            'ec2:ModifyLaunchTemplate',
            'ec2:DeleteLaunchTemplate',
            'ec2:DeleteLaunchTemplateVersions',
            'ec2:GetLaunchTemplateData',
          ],
          resource: '*',
        }),
        // EC2 VPC: full access for VPC infrastructure
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:CreateVpc',
            'ec2:DeleteVpc',
            'ec2:ModifyVpcAttribute',
            'ec2:CreateSubnet',
            'ec2:DeleteSubnet',
            'ec2:ModifySubnetAttribute',
            'ec2:CreateSecurityGroup',
            'ec2:DeleteSecurityGroup',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:AuthorizeSecurityGroupEgress',
            'ec2:RevokeSecurityGroupIngress',
            'ec2:RevokeSecurityGroupEgress',
            'ec2:CreateInternetGateway',
            'ec2:DeleteInternetGateway',
            'ec2:AttachInternetGateway',
            'ec2:DetachInternetGateway',
            'ec2:CreateRouteTable',
            'ec2:DeleteRouteTable',
            'ec2:CreateRoute',
            'ec2:DeleteRoute',
            'ec2:ReplaceRoute',
            'ec2:AssociateRouteTable',
            'ec2:DisassociateRouteTable',
          ],
          resource: '*',
        }),
        // Secrets Manager: read/write for integration tests
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:CreateSecret',
            'secretsmanager:DeleteSecret',
          ],
          resource: '*',
        }),
        // SSM Parameter Store: read/write + tags for integration & acceptance tests.
        //   - GetParameter: plaintext value-compare drift detection (String only; no decrypt)
        //   - DescribeParameters: metadata-only reconcile (the SecureString write-only path)
        //   - ListTagsForResource / AddTagsToResource / RemoveTagsFromResource: roundtrip tags
        //   note: a change here must re-apply BOTH the SSO permission set (account=.root) AND
        //   the OIDC role (account=demo) per hazard.local-green-cicd-red.oidc-role-not-reapplied
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ssm:PutParameter',
            'ssm:DeleteParameter',
            'ssm:GetParameter',
            'ssm:DescribeParameters',
            'ssm:ListTagsForResource',
            'ssm:AddTagsToResource',
            'ssm:RemoveTagsFromResource',
          ],
          resource: '*',
        }),
        // SSM Sessions: for SSH/VPC tunnel connections
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ssm:StartSession',
            'ssm:TerminateSession',
            'ssm:ResumeSession',
            'ssm:DescribeSessions',
          ],
          resource: '*',
        }),
        // SSM Commands: for remote command execution
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['ssm:SendCommand', 'ssm:GetCommandInvocation'],
          resource: '*',
        }),
        // EC2 Instance Connect: push ephemeral SSH keys to instances
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['ec2-instance-connect:SendSSHPublicKey'],
          resource: '*',
        }),
        // Budgets: cap + notifications + actions (guards)
        // .note = wildcard on the test-execution policy — the reconcile paths call
        //         reads (ViewBudget / Describe*ForBudget / Describe*ForNotification /
        //         DescribeBudgetActionsForBudget), writes, AND tag actions
        //         (TagResource / UntagResource / ListTagsForResource); the tag actions
        //         are gated separately from ViewBudget, so a wildcard on resource '*'
        //         is the one grant that covers every action the daos touch
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['budgets:*'],
          resource: '*',
        }),
        // Cost Explorer: anomaly monitors + subscriptions
        // .note = wildcard for the same reason — the daos call Get* reads
        //         (GetAnomalyMonitors / GetAnomalySubscriptions) + tag actions in
        //         addition to Create / Update / Delete
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['ce:*'],
          resource: '*',
        }),
        // CloudWatch Alarms: metric alarms (e.g. the EstimatedCharges cost alarm)
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'cloudwatch:PutMetricAlarm',
            'cloudwatch:DeleteAlarms',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:ListTagsForResource',
            'cloudwatch:TagResource',
            'cloudwatch:UntagResource',
          ],
          resource: '*',
        }),
      ],
    }),
  });
