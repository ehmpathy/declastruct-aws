import {
  DeleteInternetGatewayCommand,
  DescribeInternetGatewaysCommand,
  DetachInternetGatewayCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsVpc } from '@src/domain.objects/DeclaredAwsVpc';
import { DeclaredAwsVpcInternetGateway } from '@src/domain.objects/DeclaredAwsVpcInternetGateway';
import { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
import { DeclaredAwsVpcSecurityGroup } from '@src/domain.objects/DeclaredAwsVpcSecurityGroup';
import { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';

import { delVpcInternetGateway } from '../vpcInternetGateway/delVpcInternetGateway';
import { getOneVpcInternetGateway } from '../vpcInternetGateway/getOneVpcInternetGateway';
import { setVpcInternetGateway } from '../vpcInternetGateway/setVpcInternetGateway';
import { delVpcRouteTable } from '../vpcRouteTable/delVpcRouteTable';
import { getOneVpcRouteTable } from '../vpcRouteTable/getOneVpcRouteTable';
import { setVpcRouteTable } from '../vpcRouteTable/setVpcRouteTable';
import { delVpcSecurityGroup } from '../vpcSecurityGroup/delVpcSecurityGroup';
import { getOneVpcSecurityGroup } from '../vpcSecurityGroup/getOneVpcSecurityGroup';
import { setVpcSecurityGroup } from '../vpcSecurityGroup/setVpcSecurityGroup';
import { delVpcSubnet } from '../vpcSubnet/delVpcSubnet';
import { getOneVpcSubnet } from '../vpcSubnet/getOneVpcSubnet';
import { setVpcSubnet } from '../vpcSubnet/setVpcSubnet';
import { delVpc } from './delVpc';
import { delVpcCascade } from './delVpcCascade';
import { getAllVpcs } from './getAllVpcs';
import { getOneVpc } from './getOneVpc';
import { setVpc } from './setVpc';

/**
 * .what = tags every VPC this suite creates, so orphans can be swept by tag
 * .why = a crashed or killed run never reaches afterAll, so its VPC leaks; the
 *   beforeAll sweep finds those leftovers by these tags and tears them down
 */
const TEST_VPC_TAGS = {
  managedBy: 'declastruct',
  purpose: 'integration-test',
} as const;

/**
 * .what = tears down every leftover integration-test VPC (and its dependents),
 *   then reaps any detached orphan internet gateways left by prior runs
 * .why = leaked VPCs accumulate and exhaust the account VPC quota, which makes
 *   every later run fail at CreateVpc with VpcLimitExceeded — the root cause of
 *   the orphan flake. detached internet gateways leak on their own quota the
 *   same way (InternetGatewayLimitExceeded), and a VPC cascade only reaps the
 *   IGWs still attached to a swept VPC — so a detached orphan (whose VPC was
 *   already gone) survives and must be reaped by tag directly. run this both
 *   before (sweep prior leaks) and after (clean this run) so the suite
 *   self-heals from a crashed run that never reached afterAll.
 * .note = the VPC reap uses the getAllVpcs + delVpcCascade domain ops; the
 *   detached-IGW reap uses raw EC2 (teardown is exempt from declarative-infra,
 *   as the EC2 both-ends cleanup rule shows raw-SDK cleanup in teardown).
 */
const sweepOrphanTestVpcs = async (
  context: Awaited<ReturnType<typeof getSampleAwsApiContext>>,
): Promise<void> => {
  // reap orphan VPCs (and each one's attached dependents) by tag
  const orphans = await getAllVpcs({ by: { tags: TEST_VPC_TAGS } }, context);
  for (const orphan of orphans) {
    if (!orphan.id) continue;
    await delVpcCascade({ ref: { id: orphan.id } }, context);
  }

  // reap detached orphan internet gateways by tag (their VPC is already gone)
  const ec2 = new EC2Client({ region: context.aws.credentials.region });
  const igws = await ec2.send(
    new DescribeInternetGatewaysCommand({
      Filters: Object.entries(TEST_VPC_TAGS).map(([key, value]) => ({
        Name: `tag:${key}`,
        Values: [value],
      })),
    }),
  );
  for (const igw of igws.InternetGateways ?? []) {
    if (!igw.InternetGatewayId) continue;
    // detach from any VPC it still clings to, then delete
    for (const attachment of igw.Attachments ?? []) {
      if (!attachment.VpcId) continue;
      await ec2
        .send(
          new DetachInternetGatewayCommand({
            InternetGatewayId: igw.InternetGatewayId,
            VpcId: attachment.VpcId,
          }),
        )
        .catch((error: unknown) => {
          if (error instanceof Error && /\.NotFound$/.test(error.name)) return;
          throw error;
        });
    }
    await ec2
      .send(
        new DeleteInternetGatewayCommand({
          InternetGatewayId: igw.InternetGatewayId,
        }),
      )
      .catch((error: unknown) => {
        if (error instanceof Error && /\.NotFound$/.test(error.name)) return;
        throw error;
      });
  }
};

/**
 * .what = journey test for VPC infrastructure lifecycle
 * .why = validates full workflow against real AWS EC2 API
 * .note
 *   - creates and deletes test resources
 *   - tests idempotency and error cases
 *   - uses unique exid per test run to avoid collisions
 *   - requires ec2:CreateVpc, ec2:CreateSubnet, ec2:CreateSecurityGroup,
 *     ec2:CreateInternetGateway, ec2:CreateRouteTable, ec2:AttachInternetGateway,
 *     ec2:AssociateRouteTable, and their delete counterparts
 */
describe('vpc.journey', () => {
  // generate unique exid prefix for this test run
  const testId = genTestUuid().slice(0, 8);
  const exidPrefix = `declastruct-test-${testId}`;

  // test VPC declaration
  const testVpc = DeclaredAwsVpc.as({
    exid: `${exidPrefix}-vpc`,
    cidr: { v4: '10.99.0.0/16' },
    dns: { hostnames: 'enabled', support: 'enabled' },
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // test subnet declaration
  const testSubnet = DeclaredAwsVpcSubnet.as({
    exid: `${exidPrefix}-subnet`,
    vpc: { exid: testVpc.exid },
    cidr: { v4: '10.99.1.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // test security group declaration
  const testSecurityGroup = DeclaredAwsVpcSecurityGroup.as({
    exid: `${exidPrefix}-sg`,
    vpc: { exid: testVpc.exid },
    name: `${exidPrefix}-sg`,
    description: 'declastruct integration test security group',
    rules: {
      ingress: [],
      egress: [
        {
          protocol: 'all',
          port: { from: 0, upto: 0 },
          cidrs: [{ v4: '0.0.0.0/0' }],
          description: 'allow all outbound',
        },
      ],
    },
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // test internet gateway declaration
  const testInternetGateway = DeclaredAwsVpcInternetGateway.as({
    exid: `${exidPrefix}-igw`,
    vpc: { exid: testVpc.exid },
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // test route table declaration
  const testRouteTable = DeclaredAwsVpcRouteTable.as({
    exid: `${exidPrefix}-rt`,
    vpc: { exid: testVpc.exid },
    routes: [
      {
        destination: { cidr: { v4: '0.0.0.0/0' } },
        target: { gatewayInternet: { exid: testInternetGateway.exid } },
      },
    ],
    associations: [{ subnet: { exid: testSubnet.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'integration-test' },
  });

  // cleanup BEFORE: sweep orphan test VPCs left by prior crashed runs
  // .why = afterAll never runs when a run crashes or is killed mid-flight, so a
  //   VPC created at [t1] leaks. leaked VPCs accumulate and eventually exhaust
  //   the account VPC quota, which makes every later run fail at CreateVpc with
  //   VpcLimitExceeded. sweep here so the suite self-heals from prior leaks.
  beforeAll(async () => {
    const context = await getSampleAwsApiContext();
    await sweepOrphanTestVpcs(context);
  });

  // shared context
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  // cleanup AFTER: delete this run's stack, then sweep as a safety net
  // note: skip cleanup if scene wasn't initialized (test setup failed)
  afterAll(async () => {
    // guard: skip if scene not initialized
    if (!scene.context) return;
    const { context } = scene;

    // delete in reverse dependency order
    await delVpcRouteTable({ ref: { exid: testRouteTable.exid } }, context);
    await delVpcInternetGateway(
      { ref: { exid: testInternetGateway.exid } },
      context,
    );
    await delVpcSecurityGroup(
      { ref: { exid: testSecurityGroup.exid } },
      context,
    );
    await delVpcSubnet({ ref: { exid: testSubnet.exid } }, context);
    await delVpc({ ref: { exid: testVpc.exid } }, context);

    // safety net: sweep any leftover (e.g. a partial stack from a mid-run crash)
    await sweepOrphanTestVpcs(context);
  });

  given('[case1] VPC infrastructure journey', () => {
    when('[t1] findsert VPC', () => {
      then('VPC is created with id', async () => {
        const { context } = scene;
        const vpc = await setVpc({ findsert: testVpc }, context);
        expect(vpc.id).toMatch(/^vpc-[a-f0-9]+$/);
        expect(vpc.exid).toBe(testVpc.exid);
        expect(vpc.cidr.v4).toBe('10.99.0.0/16');
      });
    });

    when('[t2] findsert subnet', () => {
      then('subnet is created with id', async () => {
        const { context } = scene;
        const subnet = await setVpcSubnet({ findsert: testSubnet }, context);
        expect(subnet.id).toMatch(/^subnet-[a-f0-9]+$/);
        expect(subnet.exid).toBe(testSubnet.exid);
        expect(subnet.cidr.v4).toBe('10.99.1.0/24');
      });
    });

    when('[t3] findsert security group', () => {
      then('security group is created with id', async () => {
        const { context } = scene;
        const sg = await setVpcSecurityGroup(
          { findsert: testSecurityGroup },
          context,
        );
        expect(sg.id).toMatch(/^sg-[a-f0-9]+$/);
        expect(sg.exid).toBe(testSecurityGroup.exid);
        expect(sg.name).toBe(testSecurityGroup.name);
      });
    });

    when('[t4] findsert internet gateway', () => {
      then('internet gateway is created and attached', async () => {
        const { context } = scene;
        const igw = await setVpcInternetGateway(
          { findsert: testInternetGateway },
          context,
        );
        expect(igw.id).toMatch(/^igw-[a-f0-9]+$/);
        expect(igw.exid).toBe(testInternetGateway.exid);
      });
    });

    when('[t5] findsert route table', () => {
      then('route table is created with routes and associations', async () => {
        const { context } = scene;
        const rt = await setVpcRouteTable(
          { findsert: testRouteTable },
          context,
        );
        expect(rt.id).toMatch(/^rtb-[a-f0-9]+$/);
        expect(rt.exid).toBe(testRouteTable.exid);
        expect(rt.routes.length).toBeGreaterThanOrEqual(1);
        expect(rt.associations.length).toBe(1);
      });
    });

    when('[t6] findsert VPC again', () => {
      then('returns same VPC (idempotent)', async () => {
        const { context } = scene;
        const vpc1 = await getOneVpc(
          { by: { unique: { exid: testVpc.exid } } },
          context,
        );
        const vpc2 = await setVpc({ findsert: testVpc }, context);
        expect(vpc2.id).toBe(vpc1?.id);
      });
    });

    when('[t7] getOne by unique', () => {
      then('returns all VPC resources', async () => {
        const { context } = scene;

        const vpc = await getOneVpc(
          { by: { unique: { exid: testVpc.exid } } },
          context,
        );
        expect(vpc).not.toBeNull();
        expect(vpc?.exid).toBe(testVpc.exid);

        const subnet = await getOneVpcSubnet(
          { by: { unique: { exid: testSubnet.exid } } },
          context,
        );
        expect(subnet).not.toBeNull();
        expect(subnet?.exid).toBe(testSubnet.exid);

        const sg = await getOneVpcSecurityGroup(
          { by: { unique: { exid: testSecurityGroup.exid } } },
          context,
        );
        expect(sg).not.toBeNull();
        expect(sg?.exid).toBe(testSecurityGroup.exid);

        const igw = await getOneVpcInternetGateway(
          { by: { unique: { exid: testInternetGateway.exid } } },
          context,
        );
        expect(igw).not.toBeNull();
        expect(igw?.exid).toBe(testInternetGateway.exid);

        const rt = await getOneVpcRouteTable(
          { by: { unique: { exid: testRouteTable.exid } } },
          context,
        );
        expect(rt).not.toBeNull();
        expect(rt?.exid).toBe(testRouteTable.exid);
      });
    });

    when('[t7b] getAllVpcs by tag', () => {
      then('lists this run VPC among the tagged VPCs', async () => {
        const { context } = scene;
        const vpcs = await getAllVpcs({ by: { tags: TEST_VPC_TAGS } }, context);

        // this run's VPC must be present in the tag-filtered enumeration
        const mine = vpcs.find((vpc) => vpc.exid === testVpc.exid);
        expect(mine).toBeDefined();
        expect(mine?.cidr.v4).toBe('10.99.0.0/16');

        // every enumerated VPC carries the tag we filtered on
        for (const vpc of vpcs)
          expect(vpc.tags?.purpose).toBe(TEST_VPC_TAGS.purpose);
      });
    });

    when('[t8] delete route table', () => {
      then('route table is removed', async () => {
        const { context } = scene;
        await delVpcRouteTable({ ref: { exid: testRouteTable.exid } }, context);
        const rt = await getOneVpcRouteTable(
          { by: { unique: { exid: testRouteTable.exid } } },
          context,
        );
        expect(rt).toBeNull();
      });
    });

    when('[t9] delete internet gateway', () => {
      then('internet gateway is detached and removed', async () => {
        const { context } = scene;
        await delVpcInternetGateway(
          { ref: { exid: testInternetGateway.exid } },
          context,
        );
        const igw = await getOneVpcInternetGateway(
          { by: { unique: { exid: testInternetGateway.exid } } },
          context,
        );
        expect(igw).toBeNull();
      });
    });

    when('[t10] delete security group', () => {
      then('security group is removed', async () => {
        const { context } = scene;
        await delVpcSecurityGroup(
          { ref: { exid: testSecurityGroup.exid } },
          context,
        );
        const sg = await getOneVpcSecurityGroup(
          { by: { unique: { exid: testSecurityGroup.exid } } },
          context,
        );
        expect(sg).toBeNull();
      });
    });

    when('[t11] delete subnet', () => {
      then('subnet is removed', async () => {
        const { context } = scene;
        await delVpcSubnet({ ref: { exid: testSubnet.exid } }, context);
        const subnet = await getOneVpcSubnet(
          { by: { unique: { exid: testSubnet.exid } } },
          context,
        );
        expect(subnet).toBeNull();
      });
    });

    when('[t12] delete VPC', () => {
      then('VPC is removed', async () => {
        const { context } = scene;
        await delVpc({ ref: { exid: testVpc.exid } }, context);
        const vpc = await getOneVpc(
          { by: { unique: { exid: testVpc.exid } } },
          context,
        );
        expect(vpc).toBeNull();
      });
    });

    when('[t13] delete absent VPC', () => {
      then('is idempotent (no error)', async () => {
        const { context } = scene;
        // should not throw
        await delVpc({ ref: { exid: testVpc.exid } }, context);
      });
    });
  });

  // .why = case1 tears its stack down piece by piece (t8-t13); this proves the
  //   one-shot cascade path the orphan sweep depends on. it runs after case1, so
  //   only one test VPC is ever alive at a time (respects the account VPC cap).
  given('[case2] delVpcCascade tears down a full stack in one call', () => {
    const cascadeId = genTestUuid().slice(0, 8);
    const cascadePrefix = `declastruct-test-${cascadeId}-cascade`;

    const cascadeVpc = DeclaredAwsVpc.as({
      exid: `${cascadePrefix}-vpc`,
      cidr: { v4: '10.77.0.0/16' },
      dns: { hostnames: 'enabled', support: 'enabled' },
      tags: TEST_VPC_TAGS,
    });
    const cascadeSubnet = DeclaredAwsVpcSubnet.as({
      exid: `${cascadePrefix}-subnet`,
      vpc: { exid: cascadeVpc.exid },
      cidr: { v4: '10.77.1.0/24' },
      zone: { availability: 'us-east-1a' },
      tags: TEST_VPC_TAGS,
    });
    const cascadeSecurityGroup = DeclaredAwsVpcSecurityGroup.as({
      exid: `${cascadePrefix}-sg`,
      vpc: { exid: cascadeVpc.exid },
      name: `${cascadePrefix}-sg`,
      description: 'declastruct cascade test security group',
      rules: {
        ingress: [],
        egress: [
          {
            protocol: 'all',
            port: { from: 0, upto: 0 },
            cidrs: [{ v4: '0.0.0.0/0' }],
            description: 'allow all outbound',
          },
        ],
      },
      tags: TEST_VPC_TAGS,
    });
    const cascadeInternetGateway = DeclaredAwsVpcInternetGateway.as({
      exid: `${cascadePrefix}-igw`,
      vpc: { exid: cascadeVpc.exid },
      tags: TEST_VPC_TAGS,
    });
    const cascadeRouteTable = DeclaredAwsVpcRouteTable.as({
      exid: `${cascadePrefix}-rt`,
      vpc: { exid: cascadeVpc.exid },
      routes: [
        {
          destination: { cidr: { v4: '0.0.0.0/0' } },
          target: { gatewayInternet: { exid: cascadeInternetGateway.exid } },
        },
      ],
      associations: [{ subnet: { exid: cascadeSubnet.exid } }],
      tags: TEST_VPC_TAGS,
    });

    // stand up a full stack for this case
    const stack = useBeforeAll(async () => {
      const { context } = scene;
      const vpc = await setVpc({ findsert: cascadeVpc }, context);
      await setVpcSubnet({ findsert: cascadeSubnet }, context);
      await setVpcSecurityGroup({ findsert: cascadeSecurityGroup }, context);
      await setVpcInternetGateway(
        { findsert: cascadeInternetGateway },
        context,
      );
      await setVpcRouteTable({ findsert: cascadeRouteTable }, context);
      return { vpc };
    });

    // safety net: cascade again in case an assertion threw before teardown
    afterAll(async () => {
      if (!scene.context || !stack.vpc?.id) return;
      await delVpcCascade({ ref: { id: stack.vpc.id } }, scene.context);
    });

    when('[t0] delVpcCascade is called by VPC id', () => {
      const done = useBeforeAll(async () => {
        await delVpcCascade({ ref: { id: stack.vpc.id } }, scene.context);
        return { cascaded: true };
      });

      then('the VPC itself is gone', async () => {
        expect(done.cascaded).toBe(true);
        const vpc = await getOneVpc(
          { by: { unique: { exid: cascadeVpc.exid } } },
          scene.context,
        );
        expect(vpc).toBeNull();
      });

      then('the subnet is gone', async () => {
        const subnet = await getOneVpcSubnet(
          { by: { unique: { exid: cascadeSubnet.exid } } },
          scene.context,
        );
        expect(subnet).toBeNull();
      });

      then('the security group is gone', async () => {
        const sg = await getOneVpcSecurityGroup(
          { by: { unique: { exid: cascadeSecurityGroup.exid } } },
          scene.context,
        );
        expect(sg).toBeNull();
      });

      then('the internet gateway is gone', async () => {
        const igw = await getOneVpcInternetGateway(
          { by: { unique: { exid: cascadeInternetGateway.exid } } },
          scene.context,
        );
        expect(igw).toBeNull();
      });

      then('the route table is gone', async () => {
        const rt = await getOneVpcRouteTable(
          { by: { unique: { exid: cascadeRouteTable.exid } } },
          scene.context,
        );
        expect(rt).toBeNull();
      });
    });

    when('[t1] delVpcCascade is called again on the absent VPC', () => {
      then('is idempotent (no error)', async () => {
        await delVpcCascade({ ref: { id: stack.vpc.id } }, scene.context);
      });
    });
  });
});
