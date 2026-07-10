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
          network: { interface: { privateIp: '10.0.1.100' } },
        });
      });

      then('it should have subnet ref mapped by exid', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result.network.subnet).toEqual({ exid: 'test-subnet' });
      });

      then('it should have securityGroups refs mapped by exid', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: ['test-sg-1', 'test-sg-2'],
          templateExid: null,
        });
        expect(result.network.security.groups).toEqual([
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

  given(
    'an AWS Instance with a public ip and source/dest check disabled',
    () => {
      const awsInstance: Instance = {
        InstanceId: 'i-nat',
        Tags: [{ Key: 'exid', Value: 'nat-instance' }],
        State: { Name: 'stopped' },
        PrivateIpAddress: '10.0.1.9',
        PublicIpAddress: '52.0.0.1',
        SourceDestCheck: false,
      };

      when('cast to domain object', () => {
        then('publicIpEnabled is true and sourceDestChecked is false', () => {
          const result = castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'public-subnet',
            securityGroupExids: ['nat-sg'],
            templateExid: null,
          });
          expect(result.network.interface).toEqual({
            publicIpEnabled: true,
            sourceDestChecked: false,
            privateIp: '10.0.1.9',
            publicIp: '52.0.0.1',
          });
        });
      });
    },
  );

  given('an AWS Instance with no public ip and check absent', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-plain',
      Tags: [{ Key: 'exid', Value: 'plain-instance' }],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.2.9',
    };

    when('cast to domain object', () => {
      then(
        'publicIpEnabled is false and sourceDestChecked defaults true',
        () => {
          const result = castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'private-subnet',
            securityGroupExids: [],
            templateExid: null,
          });
          expect(result.network.interface).toEqual({
            publicIpEnabled: false,
            sourceDestChecked: true,
            privateIp: '10.0.2.9',
            publicIp: null,
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
      then('it should have privateIp nested under network.interface', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'test-subnet',
          securityGroupExids: [],
          templateExid: null,
        });
        expect(result.network.interface.privateIp).toBe('10.0.0.1');
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
        expect(result.network.security.groups).toEqual([]);
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

  given(
    'a self-stopped instance launched with a public ip (tag=true, no live PublicIpAddress)',
    () => {
      const awsInstance: Instance = {
        InstanceId: 'i-nat-stopped',
        Tags: [
          { Key: 'exid', Value: 'nat-instance' },
          { Key: 'publicIpEnabled', Value: 'true' },
        ],
        State: { Name: 'stopped' },
        PrivateIpAddress: '10.0.1.9',
        // no PublicIpAddress — AWS released it when the instance stopped
      };

      when('cast to domain object', () => {
        then(
          'publicIpEnabled reads true from the tag (not the absent runtime ip)',
          () => {
            const result = castIntoDeclaredAwsEc2Instance({
              instance: awsInstance,
              subnetExid: 'public-subnet',
              securityGroupExids: ['nat-sg'],
              templateExid: null,
            });
            expect(result.network.interface.publicIpEnabled).toBe(true);
            expect(result.network.interface.publicIp).toBeNull();
          },
        );

        then('the publicIpEnabled tag is excluded from user tags', () => {
          const result = castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'public-subnet',
            securityGroupExids: ['nat-sg'],
            templateExid: null,
          });
          expect(result.tags).toBeNull();
        });
      });
    },
  );

  given('a stopped instance with publicIpEnabled tag=false', () => {
    const awsInstance: Instance = {
      InstanceId: 'i-private',
      Tags: [
        { Key: 'exid', Value: 'private-instance' },
        { Key: 'publicIpEnabled', Value: 'false' },
      ],
      State: { Name: 'stopped' },
      PrivateIpAddress: '10.0.2.9',
    };

    when('cast to domain object', () => {
      then('publicIpEnabled reads false from the tag', () => {
        const result = castIntoDeclaredAwsEc2Instance({
          instance: awsInstance,
          subnetExid: 'private-subnet',
          securityGroupExids: [],
          templateExid: null,
        });
        expect(result.network.interface.publicIpEnabled).toBe(false);
      });
    });
  });

  given(
    'a RUNNING instance whose public ip was removed out of band (tag=true, no live ip)',
    () => {
      const awsInstance: Instance = {
        InstanceId: 'i-drifted',
        Tags: [
          { Key: 'exid', Value: 'drifted-instance' },
          { Key: 'publicIpEnabled', Value: 'true' },
        ],
        State: { Name: 'running' },
        PrivateIpAddress: '10.0.1.9',
        // no live PublicIpAddress despite tag=true — an out-of-band change
      };

      when('cast to domain object', () => {
        then(
          'publicIpEnabled reads the live value (false), not the stale tag',
          () => {
            const result = castIntoDeclaredAwsEc2Instance({
              instance: awsInstance,
              subnetExid: 'public-subnet',
              securityGroupExids: [],
              templateExid: null,
            });
            // running => live value is authoritative, so drift is caught not masked
            expect(result.network.interface.publicIpEnabled).toBe(false);
          },
        );
      });
    },
  );

  given(
    'a RUNNING instance with a live public ip (source of truth, tag absent)',
    () => {
      const awsInstance: Instance = {
        InstanceId: 'i-live',
        Tags: [{ Key: 'exid', Value: 'live-instance' }],
        State: { Name: 'running' },
        PrivateIpAddress: '10.0.1.9',
        PublicIpAddress: '52.0.0.9',
      };

      when('cast to domain object', () => {
        then('publicIpEnabled reads true from the live ip', () => {
          const result = castIntoDeclaredAwsEc2Instance({
            instance: awsInstance,
            subnetExid: 'public-subnet',
            securityGroupExids: [],
            templateExid: null,
          });
          expect(result.network.interface.publicIpEnabled).toBe(true);
        });
      });
    },
  );

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
