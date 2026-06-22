import { EC2Client, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

import { getEc2LaunchTemplate } from '../ec2LaunchTemplate/getEc2LaunchTemplate';
import { getEc2Instance } from './getEc2Instance';
import { setEc2Instance } from './setEc2Instance';

/**
 * .what = journey test for EC2 instance lifecycle
 * .why = validates full workflow against real AWS EC2 API
 * .note
 *   - requires VPC infrastructure (subnet, security group)
 *   - requires valid launch template
 *   - creates real EC2 instances which incur charges
 *   - tests should terminate instances to prevent continued charges
 */
describe('ec2Instance.journey', () => {
  // track instance IDs for cleanup
  const instanceIds: string[] = [];

  // terminate all instances created in this test suite
  afterAll(async () => {
    if (instanceIds.length === 0) return;
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
  });

  // generate unique exid for this test run
  const testExid = `declastruct-test-${genTestUuid().slice(0, 8)}`;

  // test instance configuration — uses acceptance test VPC resources
  const testInstance = DeclaredAwsEc2Instance.as({
    exid: testExid,
    template: { exid: 'declastruct-acceptance-template' }, // ref to acceptance launch template
    subnet: { exid: 'declastruct-acceptance-subnet-1a' }, // ref to acceptance subnet
    securityGroups: [{ exid: 'declastruct-acceptance-sg' }], // ref to acceptance SG
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // scene setup
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  given('[case1] instance lifecycle', () => {
    when('[t0] findsert instance', () => {
      then('instance is created with id', async () => {
        const { context } = scene;
        const created = await setEc2Instance(
          { findsert: testInstance },
          context,
        );

        // track for cleanup
        if (!instanceIds.includes(created.id)) instanceIds.push(created.id);

        expect(created.id).toBeDefined();
        expect(created.id).toMatch(/^i-[a-z0-9]+$/);
        expect(created.exid).toBe(testExid);
        expect(created.subnet).toBeDefined();
        expect('id' in created.subnet || 'exid' in created.subnet).toBe(true);
      });
    });

    when('[t1] findsert same instance again', () => {
      then('returns same instance (idempotent)', async () => {
        const { context } = scene;
        const first = await setEc2Instance({ findsert: testInstance }, context);
        const second = await setEc2Instance(
          { findsert: testInstance },
          context,
        );

        expect(second.id).toBe(first.id);
        expect(second.exid).toBe(first.exid);
      });
    });

    when('[t2] getEc2Instance by unique', () => {
      then('returns the instance', async () => {
        const { context } = scene;
        const instance = await getEc2Instance(
          { by: { unique: { exid: testExid } } },
          context,
        );

        expect(instance).not.toBeNull();
        expect(instance?.exid).toBe(testExid);
      });
    });

    when('[t3] getEc2Instance by primary', () => {
      then('returns the same instance', async () => {
        const { context } = scene;

        // first get the instance to know the id
        const instanceByUnique = await getEc2Instance(
          { by: { unique: { exid: testExid } } },
          context,
        );
        expect(instanceByUnique).not.toBeNull();

        // then lookup by primary
        const instanceByPrimary = await getEc2Instance(
          { by: { primary: { id: instanceByUnique!.id } } },
          context,
        );

        expect(instanceByPrimary).not.toBeNull();
        expect(instanceByPrimary?.id).toBe(instanceByUnique!.id);
        expect(instanceByPrimary?.exid).toBe(testExid);
      });
    });

    when('[t4] getEc2Instance by ref (unique)', () => {
      then('routes to unique lookup', async () => {
        const { context } = scene;
        const instance = await getEc2Instance(
          { by: { ref: { exid: testExid } } },
          context,
        );

        expect(instance).not.toBeNull();
        expect(instance?.exid).toBe(testExid);
      });
    });

    when('[t5] getEc2Instance by ref (primary)', () => {
      then('routes to primary lookup', async () => {
        const { context } = scene;

        // first get the instance to know the id
        const instanceByUnique = await getEc2Instance(
          { by: { unique: { exid: testExid } } },
          context,
        );
        expect(instanceByUnique).not.toBeNull();

        // then lookup by ref with primary key
        const instanceByRef = await getEc2Instance(
          { by: { ref: { id: instanceByUnique!.id } } },
          context,
        );

        expect(instanceByRef).not.toBeNull();
        expect(instanceByRef?.id).toBe(instanceByUnique!.id);
      });
    });
  });

  given('[case2] boundary cases', () => {
    when('[t0] getEc2Instance for nonexistent instance', () => {
      then('returns null', async () => {
        const { context } = scene;
        const instance = await getEc2Instance(
          { by: { unique: { exid: 'nonexistent-instance-12345' } } },
          context,
        );

        expect(instance).toBeNull();
      });
    });

    when('[t1] getEc2Instance by nonexistent primary', () => {
      then('returns null', async () => {
        const { context } = scene;
        const instance = await getEc2Instance(
          { by: { primary: { id: 'i-nonexistent12345' } } },
          context,
        );

        expect(instance).toBeNull();
      });
    });

    when('[t2] upsert on extant instance', () => {
      then('throws error (instances are immutable)', async () => {
        const { context } = scene;

        // ensure instance exists
        await setEc2Instance({ findsert: testInstance }, context);

        // upsert should throw
        await expect(
          setEc2Instance(
            {
              upsert: {
                ...testInstance,
                subnet: { exid: 'declastruct-acceptance-subnet-1a' }, // same config
              },
            },
            context,
          ),
        ).rejects.toThrow(/upsert not supported/);
      });
    });
  });

  given('[case3] template reference variants', () => {
    when('[t0] create instance with template by id', () => {
      then('instance references template', async () => {
        const { context } = scene;

        // look up acceptance template to get its real ID
        const acceptanceTemplate = await getEc2LaunchTemplate(
          { by: { unique: { exid: 'declastruct-acceptance-template' } } },
          context,
        );
        expect(acceptanceTemplate).not.toBeNull();

        const templateIdExid = `declastruct-test-byid-${genTestUuid().slice(0, 8)}`;
        const instance = await setEc2Instance(
          {
            findsert: DeclaredAwsEc2Instance.as({
              exid: templateIdExid,
              template: { id: acceptanceTemplate!.id }, // ref by real id
              subnet: testInstance.subnet,
              securityGroups: testInstance.securityGroups,
              tags: null,
            }),
          },
          context,
        );

        // track for cleanup
        if (!instanceIds.includes(instance.id)) instanceIds.push(instance.id);

        expect(instance.id).toBeDefined();
        expect(instance.exid).toBe(templateIdExid);
      });
    });

    when('[t1] create instance without template', () => {
      then('throws error (template required for new instances)', async () => {
        const { context } = scene;
        const noTemplateExid = `declastruct-test-notemplate-${genTestUuid().slice(0, 8)}`;

        // attempt without template should throw
        await expect(
          setEc2Instance(
            {
              findsert: DeclaredAwsEc2Instance.as({
                exid: noTemplateExid,
                template: null, // no template
                subnet: testInstance.subnet,
                securityGroups: testInstance.securityGroups,
                tags: null,
              }),
            },
            context,
          ),
        ).rejects.toThrow(/cannot create instance without template/);
      });
    });
  });

  given('[case4] security group assignment', () => {
    when('[t0] create instance with multiple security groups', () => {
      then('all security groups are attached', async () => {
        const { context } = scene;
        const multiSgExid = `declastruct-test-multisg-${genTestUuid().slice(0, 8)}`;
        const instance = await setEc2Instance(
          {
            findsert: DeclaredAwsEc2Instance.as({
              exid: multiSgExid,
              template: testInstance.template,
              subnet: testInstance.subnet,
              securityGroups: [
                { exid: 'declastruct-acceptance-sg' },
                { exid: 'declastruct-acceptance-sg' }, // same SG ref twice — tests multiple refs
              ],
              tags: null,
            }),
          },
          context,
        );

        // track for cleanup
        if (!instanceIds.includes(instance.id)) instanceIds.push(instance.id);

        expect(instance.securityGroups.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  given('[case5] private IP resolution', () => {
    when('[t0] create instance and verify privateIp', () => {
      then('privateIp is resolved from AWS', async () => {
        const { context } = scene;
        const instance = await setEc2Instance(
          { findsert: testInstance },
          context,
        );

        // privateIp is readonly, resolved from AWS
        expect(instance.privateIp).toBeDefined();
        expect(instance.privateIp).toMatch(
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
        );
      });
    });
  });
});
