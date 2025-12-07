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

export const SSO_ADMIN_USERNAME: string =
  process.env.SSO_ADMIN_USERNAME ??
  UnexpectedCodePathError.throw(
    'dont forget to declare the SSO_ADMIN_USERNAME. not checked in',
  );
export const SSO_ADMIN_EMAIL: string =
  process.env.SSO_ADMIN_EMAIL ??
  UnexpectedCodePathError.throw(
    'dont forget to declare the SSO_ADMIN_EMAIL. not checked in',
  );
export const SSO_DEMO_EMAIL: string =
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
      ],
    }),
  });
