import type { ResponseLaunchTemplateData } from '@aws-sdk/client-ec2';
import { omitReadonly, serialize } from 'domain-objects';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import {
  ec2InstanceMetadataOptionsAwsImplicit,
  ec2InstanceMetadataOptionsSecure,
} from '@src/domain.objects/DeclaredAwsEc2InstanceMetadataOptions';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

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

  // clamp for a 3rd AMI family whose root is neither /dev/xvda nor /dev/sda1:
  // the read path must still report the declared size/encrypt, not the defaults —
  // else a re-plan would drift forever (rule.require.immutable-source-of-truth)
  given('launch template with a 3rd-family root device (/dev/nvme0n1)', () => {
    when('cast to domain object', () => {
      then('it reads the sole root block device, not the defaults', () => {
        const data: ResponseLaunchTemplateData = {
          InstanceType: 't3.micro',
          BlockDeviceMappings: [
            {
              DeviceName: '/dev/nvme0n1',
              Ebs: { VolumeSize: 64, Encrypted: true },
            },
          ],
        };
        const result = castIntoDeclaredAwsEc2LaunchTemplate({
          id: 'lt-nvme',
          data,
          tags: [{ Key: 'exid', Value: 'nvme-template' }],
        });
        expect(result.rootVolumeSize).toBe(64);
        expect(result.rootVolumeEncrypted).toBe(true);
      });
    });
  });

  // fail loud rather than a silent positional guess when the root is ambiguous:
  // many block devices, none a known root name (e.g. a foreign template)
  given(
    'launch template with multiple block devices, none a known root',
    () => {
      when('cast to domain object', () => {
        then('it throws rather than guess a non-root volume', async () => {
          const data: ResponseLaunchTemplateData = {
            InstanceType: 't3.micro',
            BlockDeviceMappings: [
              {
                DeviceName: '/dev/xvdf',
                Ebs: { VolumeSize: 500, Encrypted: false },
              },
              {
                DeviceName: '/dev/xvdg',
                Ebs: { VolumeSize: 200, Encrypted: true },
              },
            ],
          };
          const error = await getError(() =>
            castIntoDeclaredAwsEc2LaunchTemplate({
              id: 'lt-ambiguous',
              data,
              tags: [{ Key: 'exid', Value: 'ambiguous-template' }],
            }),
          );
          expect(error.message).toContain('multiple block devices');
        });
      });
    },
  );

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

  given('launch template with secure-default metadata options', () => {
    const data: ResponseLaunchTemplateData = {
      InstanceType: 't3.micro',
      MetadataOptions: {
        HttpTokens: 'required',
        HttpPutResponseHopLimit: 1,
        HttpEndpoint: 'enabled',
      },
    };

    when('cast to domain object', () => {
      then(
        'metadataOptions collapses to null so a secure box converges to KEEP',
        () => {
          const result = castIntoDeclaredAwsEc2LaunchTemplate({
            id: 'lt-secure',
            data,
            tags: [{ Key: 'exid', Value: 'secure-template' }],
          });
          expect(result.metadataOptions).toBeNull();
        },
      );
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

      then(
        'metadataOptions reads back AWS-implicit (insecure), NOT collapsed to null',
        () => {
          // the false-KEEP guard, proven END-TO-END through the real pipeline:
          // castInto -> asDeclaredAwsEc2InstanceMetadataOptions (transformer) ->
          // DeclaredAwsEc2LaunchTemplate constructor (canonicalizer). a pre-feature
          // template AWS returns with NO MetadataOptions must read back as the honest
          // imdsv1-allowed value (NOT the secure null), so a legacy insecure box plans a
          // change instead of a false KEEP. the two halves are unit-tested in isolation
          // (the transformer's undefined->AWS-implicit + the canonicalizer's
          // preserve-AWS-implicit); this asserts they stay WIRED so a future refactor of
          // either half cannot silently reintroduce the false KEEP (an insecure box
          // masked as converged — the exact rule.require.immutable-source-of-truth hole).
          const result = castIntoDeclaredAwsEc2LaunchTemplate({
            id: 'lt-minimal',
            data,
            tags: [{ Key: 'exid', Value: 'minimal' }],
          });
          expect(result.metadataOptions).toEqual(
            ec2InstanceMetadataOptionsAwsImplicit,
          );
        },
      );
    });
  });

  // this is the plan-level KEEP-convergence proof for the fulcrum asymmetry a peer
  // review surfaced: a caller who declares the LITERAL secure values (not null) must
  // still converge to KEEP against a secure box read back — else the immutable-upsert
  // throw fires on every re-apply. declastruct decides KEEP via
  // serialize(omitReadonly(desired)) === serialize(omitReadonly(remote)) (see
  // declastruct computeChange), so this asserts that exact equality deterministically,
  // without a live plan. proven for BOTH the literal-secure and the null declaration
  given(
    'a secure launch template read back from AWS (KEEP convergence)',
    () => {
      const secureRead: ResponseLaunchTemplateData = {
        InstanceType: 't3.micro',
        ImageId: 'ami-12345678',
        MetadataOptions: {
          HttpTokens: 'required',
          HttpPutResponseHopLimit: 1,
          HttpEndpoint: 'enabled',
        },
      };
      const remote = castIntoDeclaredAwsEc2LaunchTemplate({
        id: 'lt-secure-converge',
        data: secureRead,
        tags: [{ Key: 'exid', Value: 'converge-template' }],
      });

      when('the secure read-back is cast (end-to-end collapse)', () => {
        then(
          'remote metadataOptions collapses to null via the constructor',
          () => {
            expect(remote.metadataOptions).toBeNull();
          },
        );
      });

      // the shared fields a peer desired declaration carries
      const desiredBase = {
        id: 'lt-secure-converge',
        exid: 'converge-template',
        instanceType: 't3.micro',
        imageId: 'ami-12345678',
        hibernation: false,
        rootVolumeSize: 8,
        rootVolumeEncrypted: false,
        iamInstanceProfile: null,
        userData: null,
        tags: null,
      };

      when('a caller declares the LITERAL secure values', () => {
        const desired = DeclaredAwsEc2LaunchTemplate.as({
          ...desiredBase,
          metadataOptions: ec2InstanceMetadataOptionsSecure,
        });

        then('the literal-secure metadataOptions collapses to null', () => {
          expect(desired.metadataOptions).toBeNull();
        });

        then(
          'desired serialize-equals remote -> KEEP (not UPDATE forever)',
          () => {
            expect(serialize(omitReadonly(desired))).toBe(
              serialize(omitReadonly(remote)),
            );
          },
        );
      });

      when('a caller declares null (omits the field)', () => {
        const desired = DeclaredAwsEc2LaunchTemplate.as({
          ...desiredBase,
          metadataOptions: null,
        });

        then('desired serialize-equals remote -> KEEP', () => {
          expect(serialize(omitReadonly(desired))).toBe(
            serialize(omitReadonly(remote)),
          );
        });
      });
    },
  );
});
