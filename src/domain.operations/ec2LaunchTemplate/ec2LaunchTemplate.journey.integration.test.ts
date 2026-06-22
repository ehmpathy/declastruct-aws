import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { getEc2LaunchTemplate } from './getEc2LaunchTemplate';
import { setEc2LaunchTemplate } from './setEc2LaunchTemplate';

/**
 * .what = journey test for EC2 launch template lifecycle
 * .why = validates full workflow against real AWS EC2 API
 * .note
 *   - requires valid AMI id for test region
 *   - creates and does NOT delete test resources (manual cleanup required)
 *   - tests idempotency and boundary cases
 */
describe('ec2LaunchTemplate.journey', () => {
  // generate unique exid for this test run
  const testExid = `declastruct-test-${genTestUuid().slice(0, 8)}`;

  // test launch template configuration
  const testTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: testExid,
    instanceType: 't3.micro',
    imageId: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 (us-east-1) — update for test region
    hibernation: false,
    rootVolumeSize: 8,
    rootVolumeEncrypted: true,
    iamInstanceProfile: null,
    userData: null,
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // scene setup
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  // note: no afterAll cleanup — launch templates must be manually deleted
  // EC2 launch templates cannot be deleted via API if instances reference them

  given('[case1] launch template lifecycle', () => {
    when('[t0] findsert launch template', () => {
      then('template is created with id', async () => {
        const { context } = scene;
        const created = await setEc2LaunchTemplate(
          { findsert: testTemplate },
          context,
        );

        expect(created.id).toBeDefined();
        expect(created.id).toMatch(/^lt-[a-z0-9]+$/);
        expect(created.exid).toBe(testExid);
        expect(created.instanceType).toBe('t3.micro');
        expect(created.imageId).toBe(testTemplate.imageId);
        expect(created.hibernation).toBe(false);
        expect(created.rootVolumeSize).toBe(8);
        expect(created.rootVolumeEncrypted).toBe(true);
      });
    });

    when('[t1] findsert same template again', () => {
      then('returns same template (idempotent)', async () => {
        const { context } = scene;
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
      then('throws error (templates are immutable)', async () => {
        const { context } = scene;

        // ensure template exists
        await setEc2LaunchTemplate({ findsert: testTemplate }, context);

        // upsert should throw
        await expect(
          setEc2LaunchTemplate(
            {
              upsert: {
                ...testTemplate,
                instanceType: 't3.small', // different config
              },
            },
            context,
          ),
        ).rejects.toThrow(/upsert not supported/);
      });
    });
  });

  given('[case3] hibernation configuration', () => {
    const hibernationExid = `declastruct-test-hibernate-${genTestUuid().slice(0, 8)}`;

    when('[t0] create template with hibernation enabled', () => {
      then('hibernation is configured', async () => {
        const { context } = scene;
        const template = await setEc2LaunchTemplate(
          {
            findsert: DeclaredAwsEc2LaunchTemplate.as({
              exid: hibernationExid,
              instanceType: 't3.micro',
              imageId: testTemplate.imageId,
              hibernation: true, // requires encrypted root volume
              rootVolumeSize: 16, // hibernation needs enough space for RAM
              rootVolumeEncrypted: true, // required for hibernation
              iamInstanceProfile: null,
              userData: null,
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
        const { context } = scene;

        // create template with userData
        const created = await setEc2LaunchTemplate(
          {
            findsert: DeclaredAwsEc2LaunchTemplate.as({
              exid: userDataExid,
              instanceType: 't3.micro',
              imageId: testTemplate.imageId,
              hibernation: false,
              rootVolumeSize: 8,
              rootVolumeEncrypted: true,
              iamInstanceProfile: null,
              userData: testUserData,
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
});
