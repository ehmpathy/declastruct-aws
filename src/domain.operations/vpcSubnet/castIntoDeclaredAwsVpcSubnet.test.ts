import type { Subnet } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsVpcSubnet } from './castIntoDeclaredAwsVpcSubnet';

describe('castIntoDeclaredAwsVpcSubnet', () => {
  given('an AWS Subnet with all properties', () => {
    when('cast to domain object', () => {
      then('it should cast with all properties mapped', () => {
        const awsSubnet: Subnet = {
          SubnetId: 'subnet-1234567890abcdef0',
          VpcId: 'vpc-abc123',
          CidrBlock: '10.0.1.0/24',
          AvailabilityZone: 'us-east-1a',
          Tags: [
            { Key: 'exid', Value: 'test-subnet' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        };
        const result = castIntoDeclaredAwsVpcSubnet(awsSubnet, 'test-vpc-exid');
        expect(result).toMatchObject({
          id: 'subnet-1234567890abcdef0',
          exid: 'test-subnet',
          vpc: { exid: 'test-vpc-exid' },
          cidr: { v4: '10.0.1.0/24' },
          zone: { availability: 'us-east-1a' },
          tags: { managedBy: 'declastruct' },
        });
      });
    });
  });

  given('an AWS Subnet without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsSubnet: Subnet = {
          SubnetId: 'subnet-abc',
          VpcId: 'vpc-abc123',
          CidrBlock: '10.0.1.0/24',
          AvailabilityZone: 'us-east-1a',
          Tags: [{ Key: 'Name', Value: 'some-name' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcSubnet(awsSubnet, 'test-vpc-exid'),
        );
        expect(error.message).toContain('subnet lacks exid tag');
      });
    });
  });

  given('an AWS Subnet without SubnetId', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsSubnet: Subnet = {
          VpcId: 'vpc-abc123',
          CidrBlock: '10.0.1.0/24',
          AvailabilityZone: 'us-east-1a',
          Tags: [{ Key: 'exid', Value: 'test-subnet' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcSubnet(awsSubnet, 'test-vpc-exid'),
        );
        expect(error.message).toContain('subnet lacks id');
      });
    });
  });

  given('an AWS Subnet without VpcId', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsSubnet: Subnet = {
          SubnetId: 'subnet-abc',
          CidrBlock: '10.0.1.0/24',
          AvailabilityZone: 'us-east-1a',
          Tags: [{ Key: 'exid', Value: 'test-subnet' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcSubnet(awsSubnet, 'test-vpc-exid'),
        );
        expect(error.message).toContain('subnet lacks vpc id');
      });
    });
  });

  given('an AWS Subnet with only exid tag', () => {
    when('cast to domain object', () => {
      then('it should cast without tags property', () => {
        const awsSubnet: Subnet = {
          SubnetId: 'subnet-minimal',
          VpcId: 'vpc-abc123',
          CidrBlock: '10.0.1.0/24',
          AvailabilityZone: 'us-east-1a',
          Tags: [{ Key: 'exid', Value: 'minimal-subnet' }],
        };
        const result = castIntoDeclaredAwsVpcSubnet(awsSubnet, 'test-vpc-exid');
        expect(result.tags).toBeNull();
      });
    });
  });
});
