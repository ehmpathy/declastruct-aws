import type { Instance } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castToDeclaredAwsEc2Instance } from './castToDeclaredAwsEc2Instance';

describe('castToDeclaredAwsEc2Instance', () => {
  given('an AWS Instance with all properties', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castToDeclaredAwsEc2Instance>;

      then('it should cast', () => {
        const awsInstance: Instance = {
          InstanceId: 'i-1234567890abcdef0',
          Tags: [{ Key: 'exid', Value: 'test-bastion' }],
          State: { Name: 'running' },
          PrivateIpAddress: '10.0.1.100',
        };
        result = castToDeclaredAwsEc2Instance(awsInstance);
      });

      then('it should have all properties mapped', () => {
        expect(result).toMatchObject({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          status: 'running',
          privateIp: '10.0.1.100',
        });
      });
    });
  });

  given('an AWS Instance without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsInstance: Instance = {
          InstanceId: 'i-abc',
          Tags: [{ Key: 'Name', Value: 'some-name' }],
          State: { Name: 'stopped' },
        };
        const error = await getError(() =>
          castToDeclaredAwsEc2Instance(awsInstance),
        );
        expect(error.message).toContain('ec2 instance lacks exid tag');
      });
    });
  });

  given('an AWS Instance with minimal properties', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsInstance: Instance = {
          InstanceId: 'i-minimal',
        };
        const error = await getError(() =>
          castToDeclaredAwsEc2Instance(awsInstance),
        );
        expect(error.message).toContain('ec2 instance lacks exid tag');
      });
    });
  });

  given('an AWS Instance with all readonly fields', () => {
    when('cast to domain object', () => {
      let result: ReturnType<typeof castToDeclaredAwsEc2Instance>;

      then('it should cast successfully', () => {
        const awsInstance: Instance = {
          InstanceId: 'i-readonly',
          Tags: [{ Key: 'exid', Value: 'readonly-instance' }],
          State: { Name: 'stopped' },
          PrivateIpAddress: '10.0.0.1',
        };
        result = castToDeclaredAwsEc2Instance(awsInstance);
      });

      then('it should have status and privateIp', () => {
        expect(result.status).toBe('stopped');
        expect(result.privateIp).toBe('10.0.0.1');
      });
    });
  });
});
