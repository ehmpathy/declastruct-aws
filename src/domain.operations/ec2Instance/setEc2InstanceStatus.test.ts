import {
  DescribeInstancesCommand,
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { given, then, when } from 'test-fns';

import { getSampleAwsApiContext } from '../../.test/getSampleAwsApiContext';
import type { DeclaredAwsEc2Instance } from '../../domain.objects/DeclaredAwsEc2Instance';
import { setEc2InstanceStatus } from './setEc2InstanceStatus';

const ec2Mock = mockClient(EC2Client);

const mockContext = getSampleAwsApiContext();

describe('setEc2InstanceStatus', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  given('an instance that is already running', () => {
    when('setting status to running', () => {
      let result: DeclaredAwsEc2Instance;

      then(
        'it should skip and return existing instance (idempotent)',
        async () => {
          ec2Mock.on(DescribeInstancesCommand).resolves({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-456',
                    Tags: [{ Key: 'exid', Value: 'already-running' }],
                    State: { Name: 'running' },
                    PrivateIpAddress: '10.0.1.100',
                  },
                ],
              },
            ],
          });

          result = await setEc2InstanceStatus(
            {
              by: { instance: { exid: 'already-running' } },
              to: { status: 'running' },
            },
            mockContext,
          );
        },
      );

      then('StartInstancesCommand should not be called', () => {
        expect(ec2Mock.commandCalls(StartInstancesCommand)).toHaveLength(0);
      });

      then('it should return the existing instance', () => {
        expect(result.status).toBe('running');
      });
    });
  });

  given('an instance that is already stopped', () => {
    when('setting status to stopped', () => {
      let result: DeclaredAwsEc2Instance;

      then(
        'it should skip and return existing instance (idempotent)',
        async () => {
          ec2Mock.on(DescribeInstancesCommand).resolves({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-789',
                    Tags: [{ Key: 'exid', Value: 'already-stopped' }],
                    State: { Name: 'stopped' },
                    PrivateIpAddress: '10.0.1.101',
                  },
                ],
              },
            ],
          });

          result = await setEc2InstanceStatus(
            {
              by: { instance: { exid: 'already-stopped' } },
              to: { status: 'stopped' },
            },
            mockContext,
          );
        },
      );

      then('StopInstancesCommand should not be called', () => {
        expect(ec2Mock.commandCalls(StopInstancesCommand)).toHaveLength(0);
      });

      then('it should return the existing instance', () => {
        expect(result.status).toBe('stopped');
      });
    });
  });

  given('an instance that does not exist', () => {
    when('setting status', () => {
      then('it should throw BadRequestError', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [],
        });

        await expect(
          setEc2InstanceStatus(
            {
              by: { instance: { exid: 'nonexistent' } },
              to: { status: 'running' },
            },
            mockContext,
          ),
        ).rejects.toThrow('cant find instance to set status of');
      });
    });
  });
});
