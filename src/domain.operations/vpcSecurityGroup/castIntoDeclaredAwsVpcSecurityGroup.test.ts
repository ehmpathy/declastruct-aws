import type { SecurityGroup } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsVpcSecurityGroup } from './castIntoDeclaredAwsVpcSecurityGroup';

describe('castIntoDeclaredAwsVpcSecurityGroup', () => {
  given('an AWS SecurityGroup with all properties', () => {
    when('cast to domain object', () => {
      then('it should cast with all properties mapped', () => {
        const awsSg: SecurityGroup = {
          GroupId: 'sg-1234567890abcdef0',
          GroupName: 'test-sg',
          Description: 'Test security group',
          VpcId: 'vpc-abc123',
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 443,
              ToPort: 443,
              IpRanges: [{ CidrIp: '0.0.0.0/0', Description: 'Allow HTTPS' }],
            },
          ],
          IpPermissionsEgress: [
            {
              IpProtocol: '-1',
              FromPort: -1,
              ToPort: -1,
              IpRanges: [
                { CidrIp: '0.0.0.0/0', Description: 'Allow all outbound' },
              ],
            },
          ],
          Tags: [
            { Key: 'exid', Value: 'test-sg' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        };
        const result = castIntoDeclaredAwsVpcSecurityGroup(awsSg, 'test-vpc-exid');
        expect(result).toMatchObject({
          id: 'sg-1234567890abcdef0',
          exid: 'test-sg',
          vpc: { exid: 'test-vpc-exid' },
          name: 'test-sg',
          description: 'Test security group',
          rules: {
            ingress: [
              {
                protocol: 'tcp',
                port: { from: 443, upto: 443 },
                cidrs: [{ v4: '0.0.0.0/0' }],
                description: 'Allow HTTPS',
              },
            ],
            egress: [
              {
                protocol: 'all',
                port: { from: 0, upto: 0 },
                cidrs: [{ v4: '0.0.0.0/0' }],
                description: 'Allow all outbound',
              },
            ],
          },
          tags: { managedBy: 'declastruct' },
        });
      });
    });
  });

  given('an AWS SecurityGroup without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsSg: SecurityGroup = {
          GroupId: 'sg-abc',
          GroupName: 'test-sg',
          VpcId: 'vpc-abc123',
          Tags: [{ Key: 'Name', Value: 'some-name' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcSecurityGroup(awsSg, 'test-vpc-exid'),
        );
        expect(error.message).toContain('security group lacks exid tag');
      });
    });
  });

  given('an AWS SecurityGroup with IPv6 rules', () => {
    when('cast to domain object', () => {
      then('it should cast IPv6 cidrs', () => {
        const awsSg: SecurityGroup = {
          GroupId: 'sg-ipv6',
          GroupName: 'ipv6-sg',
          Description: 'IPv6 security group',
          VpcId: 'vpc-abc123',
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 80,
              ToPort: 80,
              Ipv6Ranges: [
                { CidrIpv6: '::/0', Description: 'Allow HTTP IPv6' },
              ],
            },
          ],
          IpPermissionsEgress: [],
          Tags: [{ Key: 'exid', Value: 'ipv6-sg' }],
        };
        const result = castIntoDeclaredAwsVpcSecurityGroup(awsSg, 'test-vpc-exid');
        expect(result.rules.ingress[0]).toMatchObject({
          protocol: 'tcp',
          port: { from: 80, upto: 80 },
          cidrs: [{ v6: '::/0' }],
          description: 'Allow HTTP IPv6',
        });
      });
    });
  });

  given('an AWS SecurityGroup with no rules', () => {
    when('cast to domain object', () => {
      then('it should cast with empty rules', () => {
        const awsSg: SecurityGroup = {
          GroupId: 'sg-norules',
          GroupName: 'norules-sg',
          Description: 'No rules security group',
          VpcId: 'vpc-abc123',
          IpPermissions: [],
          IpPermissionsEgress: [],
          Tags: [{ Key: 'exid', Value: 'norules-sg' }],
        };
        const result = castIntoDeclaredAwsVpcSecurityGroup(awsSg, 'test-vpc-exid');
        expect(result.rules).toEqual({ ingress: [], egress: [] });
      });
    });
  });
});
