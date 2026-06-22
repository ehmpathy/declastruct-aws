import type { Instance } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsEc2Instance } from './castIntoDeclaredAwsEc2Instance';

describe('castIntoDeclaredAwsEc2Instance', () => {
  given('an AWS Instance with all properties', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-1234567890abcdef0',
      Tags: [
        { Key: 'exid', Value: 'test-bastion' },
        { Key: 'managedBy', Value: 'declastruct' },
        { Key: 'purpose', Value: 'acceptance-test' },
      ],
      State: { Name: 'running' },
      PrivateIpAddress: '10.0.1.100',
    };

    when('cast to domain object', () => {
      then('it should have basic properties mapped', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result).toMatchObject({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          privateIp: '10.0.1.100',
        });
      });

      then('it should have subnet ref mapped by exid', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result.subnet).toEqual({ exid: 'test-subnet' });
      });

      then('it should have securityGroups refs mapped by exid', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result.securityGroups).toEqual([
          { exid: 'test-sg-1' },
          { exid: 'test-sg-2' },
        ]);
      });

      then('it should have template as null when not provided', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result.template).toBeNull();
      });

      then('it should have template ref mapped by exid when provided', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: 'test-template',
        });
        expect(result.template).toEqual({ exid: 'test-template' });
      });

      then(
        'it should have tags extracted (exid and aws: prefix omitted)',
        () => {
          const result = castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'test-subnet',
            securityGroupExids: [],
            templateExid: null,
          });
          expect(result.tags).toEqual({
            managedBy: 'declastruct',
            purpose: 'acceptance-test',
          });
        },
      );
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
          castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'test-subnet',
            securityGroupExids: [],
            templateExid: null,
          }),
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
          castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'test-subnet',
            securityGroupExids: [],
            templateExid: null,
          }),
        );
        expect(error.message).toContain('ec2 instance lacks exid tag');
      });
    });
  });

  given('an AWS Instance with all readonly fields', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-readonly',
      Tags: [{ Key: 'exid', Value: 'readonly-instance' }],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.0.1',
    };

    when('cast to domain object', () => {
      then('it should have privateIp', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: [],
          templateExid: null,
        });
        expect(result.privateIp).toBe('10.0.0.1');
      });
    });
  });

  given('an AWS Instance without security groups', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-nosg',
      Tags: [{ Key: 'exid', Value: 'no-sg' }],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.0.1',
    };

    when('cast to domain object', () => {
      then('securityGroups should be empty array', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: [],
          templateExid: null,
        });
        expect(result.securityGroups).toEqual([]);
      });
    });
  });

  given('an AWS Instance without custom tags', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-notags',
      Tags: [
        { Key: 'exid', Value: 'no-tags' },
        { Key: 'aws:autoscaling:groupName', Value: 'ignored' },
      ],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.0.1',
    };

    when('cast to domain object', () => {
      then('tags should be null', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: [],
          templateExid: null,
        });
        expect(result.tags).toBeNull();
      });
    });
  });

  given('an AWS Instance with templateExid tag', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-withtmpl',
      Tags: [
        { Key: 'exid', Value: 'with-template' },
        { Key: 'templateExid', Value: 'my-template' },
        { Key: 'Name', Value: 'test-instance' },
      ],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.0.1',
    };

    when('cast to domain object', () => {
      then('templateExid tag should be excluded from tags', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: [],
          templateExid: 'my-template',
        });
        expect(result.tags).toEqual({ Name: 'test-instance' });
        expect(result.template).toEqual({ exid: 'my-template' });
      });
    });
  });
});
