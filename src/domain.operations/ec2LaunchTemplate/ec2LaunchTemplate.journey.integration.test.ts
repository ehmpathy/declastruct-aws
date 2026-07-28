import {
  DescribeImagesCommand,
  DescribeLaunchTemplateVersionsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { getError, UnexpectedCodePathError } from 'helpful-errors';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import type { DeclaredAwsEc2InstanceMetadataOptions } from '@src/domain.objects/DeclaredAwsEc2InstanceMetadataOptions';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { getEc2LaunchTemplate } from './getEc2LaunchTemplate';
import { setEc2LaunchTemplate } from './setEc2LaunchTemplate';

/**
 * .what = journey test for EC2 launch template lifecycle
 * .why = validates full workflow against real AWS EC2 API
 * .note
 *   - looks up the current Amazon Linux 2023 + ubuntu-24.04 AMIs at run time; AMI ids are
 *     region-specific and rotate, so a hardcoded id goes stale and 404s (the DescribeImages
 *     lookup setEc2LaunchTemplate now performs surfaces that as a hard error)
 *   - creates and does NOT delete test resources (manual cleanup required)
 *   - tests idempotency and boundary cases
 */
describe('ec2LaunchTemplate.journey', () => {
  // generate unique exid for this test run
  const testExid = `declastruct-test-${genTestUuid().slice(0, 8)}`;

  // scene setup — read a real, current Amazon Linux 2023 AMI (root /dev/xvda) so the
  // setEc2LaunchTemplate DescribeImages lookup succeeds; a hardcoded id would 404 once it rotates
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    const imagesResponse = await ec2.send(
      new DescribeImagesCommand({
        Owners: ['amazon'],
        Filters: [
          { Name: 'name', Values: ['al2023-ami-2023.*-kernel-*-x86_64'] },
          { Name: 'state', Values: ['available'] },
          { Name: 'architecture', Values: ['x86_64'] },
        ],
      }),
    );
    const newest = (imagesResponse.Images ?? [])
      .slice()
      .sort((a, b) =>
        (b.CreationDate ?? '').localeCompare(a.CreationDate ?? ''),
      )[0];
    const amazonLinuxImageId =
      newest?.ImageId ??
      UnexpectedCodePathError.throw(
        'no Amazon Linux 2023 AMI found in test region',
        {
          region: context.aws.credentials.region,
          hint: 'run in a region where the amazon owner publishes al2023-ami-2023 x86_64',
        },
      );
    const testTemplate = DeclaredAwsEc2LaunchTemplate.as({
      exid: testExid,
      instanceType: 't3.micro',
      imageId: amazonLinuxImageId,
      hibernation: false,
      rootVolumeSize: 8,
      rootVolumeEncrypted: true,
      iamInstanceProfile: null,
      userData: null,
      metadataOptions: null,
      tags: { managedBy: 'declastruct', purpose: 'integration-test' },
    });
    return { context, amazonLinuxImageId, testTemplate };
  });

  // note: no afterAll cleanup — launch templates must be manually deleted
  // EC2 launch templates cannot be deleted via API if instances reference them

  given('[case1] launch template lifecycle', () => {
    when('[t0] findsert launch template', () => {
      then('template is created with id', async () => {
        const { context, testTemplate, amazonLinuxImageId } = scene;
        const created = await setEc2LaunchTemplate(
          { findsert: testTemplate },
          context,
        );

        expect(created.id).toBeDefined();
        expect(created.id).toMatch(/^lt-[a-z0-9]+$/);
        expect(created.exid).toBe(testExid);
        expect(created.instanceType).toBe('t3.micro');
        expect(created.imageId).toBe(amazonLinuxImageId);
        expect(created.hibernation).toBe(false);
        expect(created.rootVolumeSize).toBe(8);
        expect(created.rootVolumeEncrypted).toBe(true);
      });
    });

    when('[t1] findsert same template again', () => {
      then('returns same template (idempotent)', async () => {
        const { context, testTemplate } = scene;
        const first = await setEc2LaunchTemplate(
          { findsert: testTemplate },
          context,
        );
        const second = await setEc2LaunchTemplate(
          { findsert: testTemplate },
          context,
        );

        expect(second.id).toBe(first.id);
        expect(second.exid).toBe(first.exid);
      });
    });

    when('[t2] getEc2LaunchTemplate by unique', () => {
      then('returns the template', async () => {
        const { context } = scene;
        const template = await getEc2LaunchTemplate(
          { by: { unique: { exid: testExid } } },
          context,
        );

        expect(template).not.toBeNull();
        expect(template?.exid).toBe(testExid);
        expect(template?.instanceType).toBe('t3.micro');
      });
    });

    when('[t3] getEc2LaunchTemplate by primary', () => {
      then('returns the same template', async () => {
        const { context } = scene;

        // first get the template to know the id
        const templateByUnique = await getEc2LaunchTemplate(
          { by: { unique: { exid: testExid } } },
          context,
        );
        expect(templateByUnique).not.toBeNull();

        // then lookup by primary
        const templateByPrimary = await getEc2LaunchTemplate(
          { by: { primary: { id: templateByUnique!.id } } },
          context,
        );

        expect(templateByPrimary).not.toBeNull();
        expect(templateByPrimary?.id).toBe(templateByUnique!.id);
        expect(templateByPrimary?.exid).toBe(testExid);
      });
    });

    when('[t4] getEc2LaunchTemplate by ref (unique)', () => {
      then('routes to unique lookup', async () => {
        const { context } = scene;
        const template = await getEc2LaunchTemplate(
          { by: { ref: { exid: testExid } } },
          context,
        );

        expect(template).not.toBeNull();
        expect(template?.exid).toBe(testExid);
      });
    });

    when('[t5] getEc2LaunchTemplate by ref (primary)', () => {
      then('routes to primary lookup', async () => {
        const { context } = scene;

        // first get the template to know the id
        const templateByUnique = await getEc2LaunchTemplate(
          { by: { unique: { exid: testExid } } },
          context,
        );
        expect(templateByUnique).not.toBeNull();

        // then lookup by ref with primary key
        const templateByRef = await getEc2LaunchTemplate(
          { by: { ref: { id: templateByUnique!.id } } },
          context,
        );

        expect(templateByRef).not.toBeNull();
        expect(templateByRef?.id).toBe(templateByUnique!.id);
      });
    });
  });

  given('[case2] boundary cases', () => {
    when('[t0] getEc2LaunchTemplate for nonexistent template', () => {
      then('returns null', async () => {
        const { context } = scene;
        const template = await getEc2LaunchTemplate(
          { by: { unique: { exid: 'nonexistent-template-12345' } } },
          context,
        );

        expect(template).toBeNull();
      });
    });

    when('[t1] getEc2LaunchTemplate by nonexistent primary', () => {
      then('returns null', async () => {
        const { context } = scene;
        const template = await getEc2LaunchTemplate(
          { by: { primary: { id: 'lt-nonexistent12345' } } },
          context,
        );

        expect(template).toBeNull();
      });
    });

    when('[t2] upsert on extant template', () => {
      then(
        'throws a stable, operator-visible immutable error (exact core message + prune hint asserted in-diff)',
        async () => {
          const { context, testTemplate } = scene;

          // ensure template exists
          await setEc2LaunchTemplate({ findsert: testTemplate }, context);

          // upsert must throw — capture the error so its operator-facing wording is snapped
          const error = await getError(
            setEc2LaunchTemplate(
              {
                upsert: {
                  ...testTemplate,
                  instanceType: 't3.small', // different config
                },
              },
              context,
            ),
          );

          // narrow to the typed error so redact reads without a cast
          if (!(error instanceof UnexpectedCodePathError)) throw error;

          // assert the EXACT operator-visible core message, in-diff (not via a snapshot).
          // redact(['metadata']) strips the metadata dump from the message, so only the
          // deterministic core text remains — the exact text is reviewable right here in
          // the diff and any drift fails the test, with no flake on the run-specific
          // template ids the metadata carries (rule.forbid.friction-hazards). an inline
          // exact assertion is preferred over toMatchSnapshot here: the string is short +
          // fully deterministic, so it needs no committed .snap and cannot silently self-write.
          // note: assert via toContain (not toBe) — helpful-errors' redact reconstructs the
          //   message with the error's class-name prefix, so redact(['metadata']).message reads
          //   "UnexpectedCodePathError: ...core...". the deterministic core text below is the
          //   assertion of record; toContain catches any drift IN it without a couple to the
          //   library's prefix format.
          expect(error.redact(['metadata']).message).toContain(
            'EC2 launch template upsert not supported — templates are immutable; create new version or delete and recreate',
          );

          // the prune hint lives in metadata (pretty-printed into the full message); assert
          // its exact text so hint text drift is caught too
          expect(error.message).toContain(
            'prune the extant template + its dependent instances, then re-apply to recreate',
          );
        },
      );
    });
  });

  given('[case3] hibernation configuration', () => {
    const hibernationExid = `declastruct-test-hibernate-${genTestUuid().slice(0, 8)}`;

    when('[t0] create template with hibernation enabled', () => {
      then('hibernation is configured', async () => {
        const { context, amazonLinuxImageId } = scene;
        const template = await setEc2LaunchTemplate(
          {
            findsert: DeclaredAwsEc2LaunchTemplate.as({
              exid: hibernationExid,
              instanceType: 't3.micro',
              imageId: amazonLinuxImageId,
              hibernation: true, // requires encrypted root volume
              rootVolumeSize: 16, // hibernation needs enough space for RAM
              rootVolumeEncrypted: true, // required for hibernation
              iamInstanceProfile: null,
              userData: null,
              metadataOptions: null,
              tags: { managedBy: 'declastruct', purpose: 'integration-test' },
            }),
          },
          context,
        );

        expect(template.hibernation).toBe(true);
        expect(template.rootVolumeEncrypted).toBe(true);
      });
    });
  });

  given('[case4] userData round-trip', () => {
    const userDataExid = `declastruct-test-userdata-${genTestUuid().slice(0, 8)}`;
    const testUserData = `#!/bin/bash
# userData for integration test
echo "hello from declastruct"
shutdown -h +5
`;

    when('[t0] create template with userData', () => {
      then('userData is stored and retrieved correctly', async () => {
        const { context, amazonLinuxImageId } = scene;

        // create template with userData
        const created = await setEc2LaunchTemplate(
          {
            findsert: DeclaredAwsEc2LaunchTemplate.as({
              exid: userDataExid,
              instanceType: 't3.micro',
              imageId: amazonLinuxImageId,
              hibernation: false,
              rootVolumeSize: 8,
              rootVolumeEncrypted: true,
              iamInstanceProfile: null,
              userData: testUserData,
              metadataOptions: null,
              tags: { managedBy: 'declastruct', purpose: 'integration-test' },
            }),
          },
          context,
        );

        expect(created.userData).toBe(testUserData);

        // read it back via get
        const retrieved = await getEc2LaunchTemplate(
          { by: { unique: { exid: userDataExid } } },
          context,
        );

        expect(retrieved).not.toBeNull();
        expect(retrieved?.userData).toBe(testUserData);
      });
    });
  });

  // .what = a non-amazon-linux AMI (ubuntu) whose real root is /dev/sda1, not /dev/xvda
  // .why = proves the block-device override targets the AMI's ACTUAL root device across
  //   families. the domain object discards DeviceName, so this case reads the RAW created
  //   launch-template version to assert the emitted DeviceName matches the AMI's real root.
  // .note = looks up the current Canonical ubuntu 24.04 AMI at run time (owner + name
  //   filter) rather than a hardcoded, rotating AMI id.
  given('[case5] ubuntu AMI (root device /dev/sda1)', () => {
    const ubuntuExid = `declastruct-test-ubuntu-${genTestUuid().slice(0, 8)}`;

    // look up the newest Canonical ubuntu-24.04 amd64 AMI + its authoritative root device
    const ubuntuScene = useBeforeAll(async () => {
      const { context } = scene;
      const ec2 = new EC2Client({
        region: context.aws.credentials.region,
      });
      const imagesResponse = await ec2.send(
        new DescribeImagesCommand({
          Owners: ['099720109477'], // Canonical
          Filters: [
            {
              Name: 'name',
              Values: [
                'ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*',
              ],
            },
            { Name: 'state', Values: ['available'] },
          ],
        }),
      );
      const newest = (imagesResponse.Images ?? [])
        .slice()
        .sort((a, b) =>
          (b.CreationDate ?? '').localeCompare(a.CreationDate ?? ''),
        )[0];
      const imageId =
        newest?.ImageId ??
        UnexpectedCodePathError.throw(
          'no Canonical ubuntu-24.04 AMI found in test region',
          {
            region: context.aws.credentials.region,
            hint: 'run in a region where Canonical publishes ubuntu-noble-24.04-amd64 (e.g. us-east-1), or widen the name filter',
          },
        );
      const rootDeviceName =
        newest?.RootDeviceName ??
        UnexpectedCodePathError.throw(
          'looked-up ubuntu AMI has no RootDeviceName',
          {
            imageId,
            hint: 'verify the AMI is describable and has a root block device; pick a standard Canonical server image',
          },
        );
      return { imageId, rootDeviceName };
    });

    when('[t0] findsert launch template on the ubuntu AMI', () => {
      then(
        'the created template targets the AMI real root device, not /dev/xvda',
        async () => {
          const { context } = scene;
          const { imageId, rootDeviceName } = ubuntuScene;

          // sanity: ubuntu names its root /dev/sda1 (the divergence this fix targets)
          expect(rootDeviceName).toBe('/dev/sda1');

          const created = await setEc2LaunchTemplate(
            {
              findsert: DeclaredAwsEc2LaunchTemplate.as({
                exid: ubuntuExid,
                instanceType: 't3.micro',
                imageId,
                hibernation: false,
                rootVolumeSize: 8,
                rootVolumeEncrypted: true,
                iamInstanceProfile: null,
                userData: null,
                metadataOptions: null,
                tags: { managedBy: 'declastruct', purpose: 'integration-test' },
              }),
            },
            context,
          );
          expect(created.id).toMatch(/^lt-[a-z0-9]+$/);

          // teeth: the domain object drops DeviceName, so read the RAW created version and
          // assert the emitted block-device targets the AMI real root (would be /dev/xvda
          // under the pre-fix hardcode — a phantom device on ubuntu)
          const ec2 = new EC2Client({
            region: context.aws.credentials.region,
          });
          const versions = await ec2.send(
            new DescribeLaunchTemplateVersionsCommand({
              LaunchTemplateId: created.id,
              Versions: ['$Latest'],
            }),
          );
          const mappings =
            versions.LaunchTemplateVersions?.[0]?.LaunchTemplateData
              ?.BlockDeviceMappings;
          expect(mappings?.[0]?.DeviceName).toBe(rootDeviceName);
          expect(mappings?.[0]?.DeviceName).toBe('/dev/sda1');
          expect(mappings?.[0]?.DeviceName).not.toBe('/dev/xvda');
          // the root-volume override still lands on that device
          expect(mappings?.[0]?.Ebs?.Encrypted).toBe(true);
        },
      );
    });
  });

  // [case6..8] explicit non-default metadataOptions round-trip (non-collapse).
  //
  // each non-default posture must flow to a real CreateLaunchTemplateCommand and read back
  // un-collapsed (NOT reduced to the secure null). the three cases are structurally
  // identical — same template-only fixture (fresh exid, no instance -> no reachable
  // credentials, so no live insecure surface), same create -> assert -> get -> assert
  // sequence — and vary ONLY in the metadataOptions value + exid prefix. so they are one
  // data-driven loop (rule.prefer.data-driven, rule.prefer.wet-over-dry): a future 4th
  // non-default value (e.g. an added HttpProtocolIpv6 sub-field) is a one-row addition.
  const nonDefaultMetadataCases: {
    label: string;
    exidPrefix: string;
    metadataOptions: DeclaredAwsEc2InstanceMetadataOptions;
  }[] = [
    {
      // docker/container box: hop 2 lets containers reach metadata through the extra hop
      label: '[case6] docker hop-2',
      exidPrefix: 'declastruct-test-imdsv2',
      metadataOptions: {
        httpTokens: 'required',
        httpPutResponseHopLimit: 2,
        httpEndpoint: 'enabled',
      },
    },
    {
      // the most security-relevant non-default (wish acceptance #6): re-allows imdsv1
      label: '[case7] imdsv1 opt-out',
      exidPrefix: 'declastruct-test-imdsv1',
      metadataOptions: {
        httpTokens: 'optional',
        httpPutResponseHopLimit: 1,
        httpEndpoint: 'enabled',
      },
    },
    {
      // the vision's named foot-gun: disabled blinds the instance role entirely
      label: '[case8] httpEndpoint disabled',
      exidPrefix: 'declastruct-test-imds-off',
      metadataOptions: {
        httpTokens: 'required',
        httpPutResponseHopLimit: 1,
        httpEndpoint: 'disabled',
      },
    },
  ];

  nonDefaultMetadataCases.forEach(({ label, exidPrefix, metadataOptions }) => {
    given(`${label} explicit metadataOptions round-trip (non-collapse)`, () => {
      const metadataExid = `${exidPrefix}-${genTestUuid().slice(0, 8)}`;

      when('[t0] create a template with the explicit non-default value', () => {
        then(
          'the explicit value flows to AWS and reads back un-collapsed',
          async () => {
            const { context, testTemplate } = scene;

            // a template-only fixture proves the non-collapse path against real
            // CreateLaunchTemplateCommand + DescribeLaunchTemplateVersions — the
            // secure-default (null) path alone cannot.
            const created = await setEc2LaunchTemplate(
              {
                findsert: DeclaredAwsEc2LaunchTemplate.as({
                  exid: metadataExid,
                  instanceType: 't3.micro',
                  imageId: testTemplate.imageId,
                  hibernation: false,
                  rootVolumeSize: 8,
                  rootVolumeEncrypted: true,
                  iamInstanceProfile: null,
                  userData: null,
                  metadataOptions,
                  tags: {
                    managedBy: 'declastruct',
                    purpose: 'integration-test',
                  },
                }),
              },
              context,
            );

            expect(created.metadataOptions).toEqual(metadataOptions);

            // read it back via get — a non-secure-default value must NOT collapse to null
            const retrieved = await getEc2LaunchTemplate(
              { by: { unique: { exid: metadataExid } } },
              context,
            );

            expect(retrieved).not.toBeNull();
            expect(retrieved?.metadataOptions).toEqual(metadataOptions);
          },
        );
      });
    });
  });
});
