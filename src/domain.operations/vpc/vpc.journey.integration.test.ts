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
import { getOneVpc } from './getOneVpc';
import { setVpc } from './setVpc';

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
 *   - set DECLASTRUCT_VPC_ENABLED=true to run
 */
const vpcEnabled = !!process.env.DECLASTRUCT_VPC_ENABLED;

(vpcEnabled ? describe : describe.skip)('vpc.journey', () => {
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

  // shared context
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();
    return { context };
  });

  // cleanup after all tests
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
});
