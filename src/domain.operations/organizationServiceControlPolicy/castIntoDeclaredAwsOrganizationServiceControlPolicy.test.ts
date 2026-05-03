import type { Policy } from '@aws-sdk/client-organizations';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsOrganizationServiceControlPolicy } from './castIntoDeclaredAwsOrganizationServiceControlPolicy';

describe('castIntoDeclaredAwsOrganizationServiceControlPolicy', () => {
  given('an AWS Policy with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<
        typeof castIntoDeclaredAwsOrganizationServiceControlPolicy
      >;

      then('it should cast', () => {
        const awsPolicy: Policy = {
          PolicySummary: {
            Id: 'p-12345678',
            Arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
            Name: 'deny-dangerous-actions',
            Description: 'block exfiltration and audit tamper',
            Type: 'SERVICE_CONTROL_POLICY',
            AwsManaged: false,
          },
          Content: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'DenySnapshotShare',
                Effect: 'Deny',
                Action: 'rds:ModifyDBSnapshotAttribute',
                Resource: '*',
              },
            ],
          }),
        };

        result = castIntoDeclaredAwsOrganizationServiceControlPolicy({
          policy: awsPolicy,
          tags: [
            { Key: 'environment', Value: 'prod' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        });
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          id: 'p-12345678',
          arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
          name: 'deny-dangerous-actions',
          description: 'block exfiltration and audit tamper',
          tags: { environment: 'prod', managedBy: 'declastruct' },
        });
        expect(result.content.statements).toHaveLength(1);
        expect(result.content.statements[0]).toMatchObject({
          sid: 'DenySnapshotShare',
          effect: 'Deny',
          action: 'rds:ModifyDBSnapshotAttribute',
          resource: '*',
        });
      });
    });
  });

  given('an AWS Policy without description', () => {
    when('cast to domain object', () => {
      then('description should be null', () => {
        const awsPolicy: Policy = {
          PolicySummary: {
            Id: 'p-abc12345',
            Arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-abc12345',
            Name: 'allow-all',
            Type: 'SERVICE_CONTROL_POLICY',
            AwsManaged: false,
          },
          Content: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*',
              },
            ],
          }),
        };

        const result = castIntoDeclaredAwsOrganizationServiceControlPolicy({
          policy: awsPolicy,
        });

        expect(result.description).toBeNull();
      });
    });
  });

  given('an AWS Policy without tags', () => {
    when('cast to domain object', () => {
      then('tags should be null', () => {
        const awsPolicy: Policy = {
          PolicySummary: {
            Id: 'p-notags123',
            Arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-notags123',
            Name: 'no-tags-policy',
            Type: 'SERVICE_CONTROL_POLICY',
            AwsManaged: false,
          },
          Content: JSON.stringify({
            Statement: [{ Effect: 'Deny', Action: '*', Resource: '*' }],
          }),
        };

        const result = castIntoDeclaredAwsOrganizationServiceControlPolicy({
          policy: awsPolicy,
        });

        expect(result.tags).toBeNull();
      });
    });
  });

  given('an AWS Policy without Id', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsPolicy = {
          PolicySummary: {
            Arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
            Name: 'test-policy',
            Type: 'SERVICE_CONTROL_POLICY',
          },
          Content: '{}',
        } as Policy;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganizationServiceControlPolicy({
            policy: awsPolicy,
          }),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('an AWS Policy without Name', () => {
    when('cast to domain object', () => {
      then('it should throw', async () => {
        const awsPolicy = {
          PolicySummary: {
            Id: 'p-12345678',
            Arn: 'arn:aws:organizations::123456789012:policy/o-abc123/service_control_policy/p-12345678',
            Type: 'SERVICE_CONTROL_POLICY',
          },
          Content: '{}',
        } as Policy;

        const error = await getError(() =>
          castIntoDeclaredAwsOrganizationServiceControlPolicy({
            policy: awsPolicy,
          }),
        );
        expect(error).toBeDefined();
      });
    });
  });

  given('an AWS-managed policy', () => {
    when('cast to domain object', () => {
      then('it should cast with aws managed flag preserved implicitly', () => {
        const awsPolicy: Policy = {
          PolicySummary: {
            Id: 'p-FullAWSAccess',
            Arn: 'arn:aws:organizations::aws:policy/service_control_policy/p-FullAWSAccess',
            Name: 'FullAWSAccess',
            Description: 'Allows access to every operation',
            Type: 'SERVICE_CONTROL_POLICY',
            AwsManaged: true,
          },
          Content: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*',
              },
            ],
          }),
        };

        const result = castIntoDeclaredAwsOrganizationServiceControlPolicy({
          policy: awsPolicy,
        });

        expect(result.name).toBe('FullAWSAccess');
        expect(result.id).toBe('p-FullAWSAccess');
      });
    });
  });
});
