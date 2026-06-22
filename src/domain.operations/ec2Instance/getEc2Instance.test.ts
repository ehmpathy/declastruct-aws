import {
  DescribeInstancesCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcAttributeCommand,
  DescribeVpcsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import type { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

import { getEc2Instance } from './getEc2Instance';

const ec2Mock = mockClient(EC2Client);

const mockContext = getMockedAwsApiContext();

describe('getEc2Instance', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  given('an instance exists with exid tag', () => {
    when('looked up by unique exid', () => {
      let result: DeclaredAwsEc2Instance | null;

      then('it should call DescribeInstances with tag filter', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [
                {
                  InstanceId: 'i-123',
                  Tags: [{ Key: 'exid', Value: 'test-bastion' }],
                  State: { Name: 'running' },
                  PrivateIpAddress: '10.0.1.50',
                  SubnetId: 'subnet-abc',
                  SecurityGroups: [{ GroupId: 'sg-123' }],
                },
              ],
            },
          ],
        });
        ec2Mock.on(DescribeSubnetsCommand).resolves({
          Subnets: [
            {
              SubnetId: 'subnet-abc',
              VpcId: 'vpc-123',
              AvailabilityZone: 'us-east-1a',
              CidrBlock: '10.0.1.0/24',
              Tags: [{ Key: 'exid', Value: 'test-subnet' }],
            },
          ],
        });
        ec2Mock.on(DescribeSecurityGroupsCommand).resolves({
          SecurityGroups: [
            {
              GroupId: 'sg-123',
              GroupName: 'test-sg',
              VpcId: 'vpc-123',
              Tags: [{ Key: 'exid', Value: 'test-sg' }],
            },
          ],
        });
        ec2Mock.on(DescribeVpcsCommand).resolves({
          Vpcs: [
            {
              VpcId: 'vpc-123',
              CidrBlock: '10.0.0.0/16',
              Tags: [{ Key: 'exid', Value: 'test-vpc' }],
            },
          ],
        });
        ec2Mock.on(DescribeVpcAttributeCommand).resolves({
          EnableDnsHostnames: { Value: true },
          EnableDnsSupport: { Value: true },
        });

        result = await getEc2Instance(
          { by: { unique: { exid: 'test-bastion' } } },
          mockContext,
        );
      });

      then('it should return the instance', () => {
        expect(result).toMatchObject({
          id: 'i-123',
          exid: 'test-bastion',
          privateIp: '10.0.1.50',
          subnet: { exid: 'test-subnet' },
          securityGroups: [{ exid: 'test-sg' }],
        });
      });
    });
  });

  given('an instance exists with id', () => {
    when('looked up by primary id', () => {
      let result: DeclaredAwsEc2Instance | null;

      then('it should call DescribeInstances with instance id', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [
                {
                  InstanceId: 'i-abc',
                  Tags: [{ Key: 'exid', Value: 'my-instance' }],
                  State: { Name: 'stopped' },
                  PrivateIpAddress: '10.0.1.51',
                  SubnetId: 'subnet-xyz',
                },
              ],
            },
          ],
        });
        ec2Mock.on(DescribeSubnetsCommand).resolves({
          Subnets: [
            {
              SubnetId: 'subnet-xyz',
              VpcId: 'vpc-456',
              AvailabilityZone: 'us-east-1b',
              CidrBlock: '10.0.2.0/24',
              Tags: [{ Key: 'exid', Value: 'my-subnet' }],
            },
          ],
        });
        ec2Mock.on(DescribeSecurityGroupsCommand).resolves({
          SecurityGroups: [],
        });
        ec2Mock.on(DescribeVpcsCommand).resolves({
          Vpcs: [
            {
              VpcId: 'vpc-456',
              CidrBlock: '10.0.0.0/16',
              Tags: [{ Key: 'exid', Value: 'my-vpc' }],
            },
          ],
        });
        ec2Mock.on(DescribeVpcAttributeCommand).resolves({
          EnableDnsHostnames: { Value: true },
          EnableDnsSupport: { Value: true },
        });

        result = await getEc2Instance(
          { by: { primary: { id: 'i-abc' } } },
          mockContext,
        );
      });

      then('it should return the instance', () => {
        expect(result).toMatchObject({
          id: 'i-abc',
          exid: 'my-instance',
          subnet: { exid: 'my-subnet' },
        });
      });
    });
  });

  given('no instance exists', () => {
    when('looked up', () => {
      let result: DeclaredAwsEc2Instance | null;

      then('it should return null', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [],
        });

        result = await getEc2Instance(
          { by: { unique: { exid: 'nonexistent' } } },
          mockContext,
        );
      });

      then('result should be null', () => {
        expect(result).toBeNull();
      });
    });
  });

  given('multiple instances found', () => {
    when('looked up', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [
                {
                  InstanceId: 'i-1',
                  Tags: [{ Key: 'exid', Value: 'dup' }],
                  State: { Name: 'running' },
                  PrivateIpAddress: '10.0.1.1',
                  SubnetId: 'subnet-1',
                },
                {
                  InstanceId: 'i-2',
                  Tags: [{ Key: 'exid', Value: 'dup' }],
                  State: { Name: 'running' },
                  PrivateIpAddress: '10.0.1.2',
                  SubnetId: 'subnet-2',
                },
              ],
            },
          ],
        });

        await expect(
          getEc2Instance({ by: { unique: { exid: 'dup' } } }, mockContext),
        ).rejects.toThrow('multiple ec2 instances found');
      });
    });
  });
});
