import {
  CreateLaunchTemplateCommand,
  DescribeImagesCommand,
  DescribeLaunchTemplatesCommand,
  DescribeLaunchTemplateVersionsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { setEc2LaunchTemplate } from './setEc2LaunchTemplate';

const ec2Mock = mockClient(EC2Client);

const context = getMockedAwsApiContext();

/**
 * .what = unit test for the AMI-derived root-device-name behavior
 * .why = AWS matches the root-volume override to a block device BY NAME, and that
 *   name is AMI-specific (amazon-linux /dev/xvda, ubuntu /dev/sda1). the template
 *   must target the AMI's real root, read from DescribeImages(...).RootDeviceName.
 */
describe('setEc2LaunchTemplate', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  // a ubuntu-style template whose AMI's real root is /dev/sda1
  const template = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'unit-ubuntu-template',
    instanceType: 't3.micro',
    imageId: 'ami-ubuntu-2404',
    hibernation: true,
    rootVolumeSize: 32,
    rootVolumeEncrypted: true,
    iamInstanceProfile: null,
    userData: null,
    tags: null,
  });

  given(
    'a findsert for a new template on an AMI whose root is /dev/sda1',
    () => {
      when('the DescribeImages lookup returns RootDeviceName /dev/sda1', () => {
        then(
          'the emitted CreateLaunchTemplate targets DeviceName /dev/sda1 (not /dev/xvda)',
          async () => {
            // findsert lookup: not found (name lookup) → create path; read-back (by id) → found
            ec2Mock.on(DescribeLaunchTemplatesCommand).callsFake((input) => {
              if (input.LaunchTemplateIds)
                return {
                  LaunchTemplates: [
                    {
                      LaunchTemplateId: input.LaunchTemplateIds[0],
                      Tags: [{ Key: 'exid', Value: template.exid }],
                    },
                  ],
                };
              return { LaunchTemplates: [] };
            });

            // the AMI's authoritative root device name
            ec2Mock.on(DescribeImagesCommand).resolves({
              Images: [{ RootDeviceName: '/dev/sda1' }],
            });

            ec2Mock.on(CreateLaunchTemplateCommand).resolves({
              LaunchTemplate: { LaunchTemplateId: 'lt-unit-ubuntu' },
            });

            // read-back version data so setEc2LaunchTemplate can return a domain object
            ec2Mock.on(DescribeLaunchTemplateVersionsCommand).resolves({
              LaunchTemplateVersions: [
                {
                  LaunchTemplateData: {
                    InstanceType: 't3.micro',
                    ImageId: 'ami-ubuntu-2404',
                    BlockDeviceMappings: [
                      {
                        DeviceName: '/dev/sda1',
                        Ebs: { VolumeSize: 32, Encrypted: true },
                      },
                    ],
                  },
                },
              ],
            });

            const created = await setEc2LaunchTemplate(
              { findsert: template },
              context,
            );
            expect(created.id).toBe('lt-unit-ubuntu');

            // the DescribeImages lookup used the template's imageId
            const describeCalls = ec2Mock.commandCalls(DescribeImagesCommand);
            expect(describeCalls).toHaveLength(1);
            expect(describeCalls[0]!.args[0]!.input).toEqual({
              ImageIds: ['ami-ubuntu-2404'],
            });

            // the CreateLaunchTemplate input targets the AMI's real root device
            const createCalls = ec2Mock.commandCalls(
              CreateLaunchTemplateCommand,
            );
            expect(createCalls).toHaveLength(1);
            const mappings =
              createCalls[0]!.args[0]!.input.LaunchTemplateData
                ?.BlockDeviceMappings;
            expect(mappings?.[0]?.DeviceName).toBe('/dev/sda1');
            expect(mappings?.[0]?.DeviceName).not.toBe('/dev/xvda');
            // the root-volume override still lands on that device
            expect(mappings?.[0]?.Ebs?.Encrypted).toBe(true);
            expect(mappings?.[0]?.Ebs?.VolumeSize).toBe(32);
          },
        );
      });
    },
  );

  given(
    'a findsert for a new template whose AMI lookup yields no RootDeviceName',
    () => {
      when('DescribeImages returns an image without a RootDeviceName', () => {
        then('it fails loud with the imageId in context', async () => {
          ec2Mock.on(DescribeLaunchTemplatesCommand).resolves({
            LaunchTemplates: [],
          });
          ec2Mock.on(DescribeImagesCommand).resolves({ Images: [{}] });

          const error = await getError(
            setEc2LaunchTemplate({ findsert: template }, context),
          );
          expect(error.message).toContain('RootDeviceName');
          expect(error.message).toContain('imageId');
          // no create was attempted — the throw precedes CreateLaunchTemplate
          expect(
            ec2Mock.commandCalls(CreateLaunchTemplateCommand),
          ).toHaveLength(0);
        });
      });
    },
  );

  // non-regression clamp for acceptance #4: an amazon-linux AMI, whose real root
  // IS /dev/xvda, must still emit /dev/xvda — the derived value serves every family
  // through the same one line, so amazon-linux stays byte-identical to before the fix
  given(
    'a findsert for a new template on an amazon-linux AMI whose root is /dev/xvda',
    () => {
      const amazonLinuxTemplate = DeclaredAwsEc2LaunchTemplate.as({
        exid: 'unit-amazonlinux-template',
        instanceType: 't3.micro',
        imageId: 'ami-amazonlinux-2023',
        hibernation: false,
        rootVolumeSize: 8,
        rootVolumeEncrypted: true,
        iamInstanceProfile: null,
        userData: null,
        tags: null,
      });

      when('the DescribeImages lookup returns RootDeviceName /dev/xvda', () => {
        then(
          'the emitted CreateLaunchTemplate targets DeviceName /dev/xvda',
          async () => {
            ec2Mock.on(DescribeLaunchTemplatesCommand).callsFake((input) => {
              if (input.LaunchTemplateIds)
                return {
                  LaunchTemplates: [
                    {
                      LaunchTemplateId: input.LaunchTemplateIds[0],
                      Tags: [{ Key: 'exid', Value: amazonLinuxTemplate.exid }],
                    },
                  ],
                };
              return { LaunchTemplates: [] };
            });

            ec2Mock.on(DescribeImagesCommand).resolves({
              Images: [{ RootDeviceName: '/dev/xvda' }],
            });

            ec2Mock.on(CreateLaunchTemplateCommand).resolves({
              LaunchTemplate: { LaunchTemplateId: 'lt-unit-amazonlinux' },
            });

            ec2Mock.on(DescribeLaunchTemplateVersionsCommand).resolves({
              LaunchTemplateVersions: [
                {
                  LaunchTemplateData: {
                    InstanceType: 't3.micro',
                    ImageId: 'ami-amazonlinux-2023',
                    BlockDeviceMappings: [
                      {
                        DeviceName: '/dev/xvda',
                        Ebs: { VolumeSize: 8, Encrypted: true },
                      },
                    ],
                  },
                },
              ],
            });

            await setEc2LaunchTemplate(
              { findsert: amazonLinuxTemplate },
              context,
            );

            const createCalls = ec2Mock.commandCalls(
              CreateLaunchTemplateCommand,
            );
            expect(createCalls).toHaveLength(1);
            const mappings =
              createCalls[0]!.args[0]!.input.LaunchTemplateData
                ?.BlockDeviceMappings;
            expect(mappings?.[0]?.DeviceName).toBe('/dev/xvda');
          },
        );
      });
    },
  );

  // idempotency-cheap clamp (vision timeline + acceptance #4 edge): on a findsert of an
  // EXTANT template, setEc2LaunchTemplate returns the found template and NEVER reaches the
  // DescribeImages read — the read is create-path-only, placed AFTER the findsert-return. a
  // refactor that moved the read earlier would add a wasted describe to every warm apply;
  // this clamp fails loud if that regresses.
  given('a findsert for a template that already is present', () => {
    when('getEc2LaunchTemplate finds it by unique', () => {
      then(
        'it returns the found template WITHOUT the DescribeImages read or a create',
        async () => {
          // the unique (name) lookup finds the extant template
          ec2Mock.on(DescribeLaunchTemplatesCommand).resolves({
            LaunchTemplates: [
              {
                LaunchTemplateId: 'lt-extant-warm',
                Tags: [{ Key: 'exid', Value: template.exid }],
              },
            ],
          });
          // its $Latest version data (a known root name so the cast reads cleanly)
          ec2Mock.on(DescribeLaunchTemplateVersionsCommand).resolves({
            LaunchTemplateVersions: [
              {
                LaunchTemplateData: {
                  InstanceType: 't3.micro',
                  ImageId: 'ami-ubuntu-2404',
                  BlockDeviceMappings: [
                    {
                      DeviceName: '/dev/sda1',
                      Ebs: { VolumeSize: 32, Encrypted: true },
                    },
                  ],
                },
              },
            ],
          });

          const found = await setEc2LaunchTemplate(
            { findsert: template },
            context,
          );
          expect(found.exid).toBe(template.exid);
          expect(found.id).toBe('lt-extant-warm');

          // the warm findsert path is read-cheap: no AMI describe, no create
          expect(ec2Mock.commandCalls(DescribeImagesCommand)).toHaveLength(0);
          expect(
            ec2Mock.commandCalls(CreateLaunchTemplateCommand),
          ).toHaveLength(0);
        },
      );
    });
  });
});
