import type { ResponseLaunchTemplateData } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsEc2LaunchTemplate } from './castIntoDeclaredAwsEc2LaunchTemplate';

describe('castIntoDeclaredAwsEc2LaunchTemplate', () => {
  given('launch template with all properties', () => {
    const data: ResponseLaunchTemplateData = {
      InstanceType: 't3.medium',
      ImageId: 'ami-12345678',
      HibernationOptions: { Configured: true },
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/xvda',
          Ebs: { VolumeSize: 50, Encrypted: true },
        },
      ],
      IamInstanceProfile: { Name: 'my-profile' },
      UserData: 'IyEvYmluL2Jhc2g=',
    };
    const tags = [
      { Key: 'exid', Value: 'test-template' },
      { Key: 'env', Value: 'test' },
    ];

    when('cast to domain object', () => {
      then('it should have basic properties mapped', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result).toMatchObject({
          id: 'lt-1234567890abcdef0',
          exid: 'test-template',
          instanceType: 't3.medium',
          imageId: 'ami-12345678',
        });
      });

      then('it should have hibernation enabled', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result.hibernation).toBe(true);
      });

      then('it should have root volume config', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result.rootVolumeSize).toBe(50);
        expect(result.rootVolumeEncrypted).toBe(true);
      });

      then('it should have IAM profile', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result.iamInstanceProfile).toEqual({ name: 'my-profile' });
      });

      then('it should have userData', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result.userData).toBe('#!/bin/bash');
      });

      then('it should have tags without exid', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-1234567890abcdef0',
          data,
          tags,
        });
        expect(result.tags).toEqual({ env: 'test' });
      });
    });
  });

  given('launch template without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const data: ResponseLaunchTemplateData = {
          InstanceType: 't3.micro',
        };
        const error = await getError(() =>
          castIntoDeclaredAwsEc2LaunchTemplate({
            id: 'lt-noexid',
            data,
            tags: [{ Key: 'Name', Value: 'some-name' }],
          }),
        );
        expect(error.message).toContain('lacks exid tag');
      });
    });
  });

  given('launch template with tags where Value is undefined', () => {
    when('cast to domain object', () => {
      then('it should filter out tags with absent values', () => {
        const data: ResponseLaunchTemplateData = {
          InstanceType: 't3.micro',
        };
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-undeftags',
          data,
          tags: [
            { Key: 'exid', Value: 'test-template' },
            { Key: 'env', Value: undefined },
            { Key: 'team' }, // Value absent
          ],
        });
        expect(result.tags).toBeNull();
      });
    });
  });

  given('launch template with /dev/sda1 root device', () => {
    when('cast to domain object', () => {
      then('it should extract root volume from /dev/sda1', () => {
        const data: ResponseLaunchTemplateData = {
          InstanceType: 't3.micro',
          BlockDeviceMappings: [
            {
              DeviceName: '/dev/sda1',
              Ebs: { VolumeSize: 100, Encrypted: false },
            },
          ],
        };
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-sda1',
          data,
          tags: [{ Key: 'exid', Value: 'sda1-template' }],
        });
        expect(result.rootVolumeSize).toBe(100);
        expect(result.rootVolumeEncrypted).toBe(false);
      });
    });
  });

  given('launch template without block device mappings', () => {
    const data: ResponseLaunchTemplateData = {
      InstanceType: 't3.micro',
    };

    when('cast to domain object', () => {
      then('it should use default root volume size', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-novolume',
          data,
          tags: [{ Key: 'exid', Value: 'no-volume' }],
        });
        expect(result.rootVolumeSize).toBe(8);
      });

      then('it should default encryption to false', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-novolume',
          data,
          tags: [{ Key: 'exid', Value: 'no-volume' }],
        });
        expect(result.rootVolumeEncrypted).toBe(false);
      });
    });
  });

  given('launch template without hibernation options', () => {
    when('cast to domain object', () => {
      then('hibernation should default to false', () => {
        const data: ResponseLaunchTemplateData = {
          InstanceType: 't3.micro',
        };
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-nohibernate',
          data,
          tags: [{ Key: 'exid', Value: 'no-hibernate' }],
        });
        expect(result.hibernation).toBe(false);
      });
    });
  });

  given('launch template without optional properties', () => {
    const data: ResponseLaunchTemplateData = {};

    when('cast to domain object', () => {
      then('instanceType should be empty string', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-minimal',
          data,
          tags: [{ Key: 'exid', Value: 'minimal' }],
        });
        expect(result.instanceType).toBe('');
      });

      then('imageId should be empty string', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-minimal',
          data,
          tags: [{ Key: 'exid', Value: 'minimal' }],
        });
        expect(result.imageId).toBe('');
      });

      then('iamInstanceProfile should be null', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-minimal',
          data,
          tags: [{ Key: 'exid', Value: 'minimal' }],
        });
        expect(result.iamInstanceProfile).toBeNull();
      });

      then('userData should be null', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-minimal',
          data,
          tags: [{ Key: 'exid', Value: 'minimal' }],
        });
        expect(result.userData).toBeNull();
      });

      then('tags should be null', () => {
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-minimal',
          data,
          tags: [{ Key: 'exid', Value: 'minimal' }],
        });
        expect(result.tags).toBeNull();
      });
    });
  });
});
