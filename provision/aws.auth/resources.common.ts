import { UnexpectedCodePathError } from 'helpful-errors';
import type { LogMethods } from 'simple-log-methods';

import {
  DeclaredAwsIamPolicyBundle,
  DeclaredAwsIamPolicyDocument,
  DeclaredAwsIamPolicyStatement,
} from '../../src/contract/sdks';

export const log: LogMethods = {
  info: console.info,
  debug: (): void => {},
  warn: console.warn,
  error: console.error,
};

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
        // EC2: start/stop instances
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: [
            'ec2:StartInstances',
            'ec2:StopInstances',
            'ec2:RebootInstances',
            'ec2:CreateTags',
            'ec2:DeleteTags',
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
        // SSM Parameter Store: read/write for integration tests
        new DeclaredAwsIamPolicyStatement({
          effect: 'Allow',
          action: ['ssm:PutParameter', 'ssm:DeleteParameter'],
          resource: '*',
        }),
      ],
    }),
  });
