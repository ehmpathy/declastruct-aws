import {
  DescribeInstancesCommand,
  EC2Client,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import { genTestUuid, given, then, useBeforeAll, when } from 'test-fns';

import { getSampleAwsApiContext } from '@src/.test/getSampleAwsApiContext';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import { DeclaredAwsEc2InstanceSession } from '@src/domain.objects/DeclaredAwsEc2InstanceSession';
import { setEc2Instance } from '@src/domain.operations/ec2Instance/setEc2Instance';
import { setEc2InstanceSession } from '@src/domain.operations/ec2InstanceSession/setEc2InstanceSession';

import { sdkEc2InstanceConnect } from './sdkEc2InstanceConnect';
import { sdkSsm } from './sdkSsm';
import { sdkSsmSession } from './sdkSsmSession';

/**
 * .what = integration tests for low-level SDK wrappers
 * .why = validates raw i/o communicators work against real AWS
 * .note
 *   - requires active EC2 instance with SSM agent
 *   - uses acceptance test infrastructure (subnet, security group, template)
 *   - creates SSM parameters which incur storage costs
 */
describe('sdks.integration', () => {
  // track instance IDs for cleanup
  const instanceIds: string[] = [];

  // cleanup BEFORE: terminate orphans from prior crashed runs
  // .why = if a test run crashes mid-execution, afterAll never runs,
  //        which leaves orphaned instances that consume vCPU quota
  beforeAll(async () => {
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });

    // find orphaned test instances by purpose tag
    // note: 'running' and 'stopped' are AWS API state names
    const orphans = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: 'tag:purpose', Values: ['sdks-test'] },
          { Name: 'instance-state-name', Values: ['running', 'stopped'] },
        ],
      }),
    );

    const orphanIds =
      orphans.Reservations?.flatMap(
        (r) => r.Instances?.map((i) => i.InstanceId).filter(Boolean) ?? [],
      ) ?? [];

    if (orphanIds.length > 0) {
      await ec2.send(
        new TerminateInstancesCommand({ InstanceIds: orphanIds as string[] }),
      );
    }
  });

  // cleanup AFTER: terminate instances created in this run
  afterAll(async () => {
    if (instanceIds.length === 0) return;
    const context = await getSampleAwsApiContext();
    const ec2 = new EC2Client({ region: context.aws.credentials.region });
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
  });

  // generate unique identifiers for this test run
  const testRunId = genTestUuid().slice(0, 8);
  const testParamName = `/declastruct-test/param-${testRunId}`;
  const testExid = `declastruct-test-sdks-${testRunId}`;

  // scene setup — create instance once for all tests
  const scene = useBeforeAll(async () => {
    const context = await getSampleAwsApiContext();

    // create test instance with SSM-enabled template
    const instance = await setEc2Instance(
      {
        findsert: DeclaredAwsEc2Instance.as({
          exid: testExid,
          template: { exid: 'declastruct-acceptance-template' },
          network: {
            subnet: { exid: 'declastruct-acceptance-subnet-private-1a' },
            security: { groups: [{ exid: 'declastruct-acceptance-sg' }] },
            interface: { publicIpEnabled: false, sourceDestChecked: true },
          },
          tags: { managedBy: 'declastruct', purpose: 'sdks-test' },
        }),
      },
      context,
    );

    // track for cleanup
    if (!instanceIds.includes(instance.id)) instanceIds.push(instance.id);

    // ensure instance is active for SSM connectivity
    await setEc2InstanceSession(
      {
        session: DeclaredAwsEc2InstanceSession.as({
          instance: { id: instance.id },
          status: 'active',
        }),
      },
      context,
    );

    return { context, instance };
  });

  given('[case1] sdkSsm parameter operations', () => {
    when('[t0] setParameter creates new parameter', () => {
      then('returns version 1', async () => {
        const { context } = scene;
        const result = await sdkSsm.setParameter(
          {
            name: testParamName,
            value: 'test-value-initial',
            description: 'declastruct sdk integration test',
          },
          context,
        );
        expect(result.version).toBe(1);
      });
    });

    when('[t1] getOneParameter retrieves parameter', () => {
      then('returns correct value', async () => {
        const { context } = scene;
        const result = await sdkSsm.getOneParameter(
          { name: testParamName },
          context,
        );
        expect(result).not.toBeNull();
        expect(result?.value).toBe('test-value-initial');
        expect(result?.name).toBe(testParamName);
        expect(result?.type).toBe('String');
      });
    });

    when('[t2] setParameter updates parameter with overwrite', () => {
      then('returns version 2', async () => {
        const { context } = scene;
        const result = await sdkSsm.setParameter(
          {
            name: testParamName,
            value: 'test-value-updated',
            overwrite: true,
          },
          context,
        );
        expect(result.version).toBe(2);
      });
    });

    when('[t3] getOneParameter for nonexistent parameter', () => {
      then('returns null', async () => {
        const { context } = scene;
        const result = await sdkSsm.getOneParameter(
          { name: '/declastruct-test/nonexistent-12345' },
          context,
        );
        expect(result).toBeNull();
      });
    });
  });

  given('[case2] sdkSsm execCommand', () => {
    when('[t0] execCommand runs simple command', () => {
      then('returns success with output', async () => {
        const { context, instance } = scene;
        const result = await sdkSsm.execCommand(
          {
            instanceId: instance.id,
            commands: ['echo "hello declastruct"'],
            timeoutSeconds: 60,
          },
          context,
        );
        expect(result.status).toBe('Success');
        expect(result.stdout).toContain('hello declastruct');
        expect(result.exitCode).toBe(0);
      });
    });

    when('[t1] execCommand with multiple commands', () => {
      then('returns all output', async () => {
        const { context, instance } = scene;
        const result = await sdkSsm.execCommand(
          {
            instanceId: instance.id,
            commands: ['echo "line1"', 'echo "line2"', 'pwd'],
            timeoutSeconds: 60,
          },
          context,
        );
        expect(result.status).toBe('Success');
        expect(result.stdout).toContain('line1');
        expect(result.stdout).toContain('line2');
        expect(result.exitCode).toBe(0);
      });
    });

    when('[t2] execCommand with failure exit code', () => {
      then('returns failed status with exit code', async () => {
        const { context, instance } = scene;
        const result = await sdkSsm.execCommand(
          {
            instanceId: instance.id,
            commands: ['exit 42'],
            timeoutSeconds: 60,
          },
          context,
        );
        expect(result.status).toBe('Failed');
        expect(result.exitCode).toBe(42);
      });
    });
  });

  given('[case3] sdkEc2InstanceConnect', () => {
    when('[t0] setSshPublicKey authorizes key', () => {
      then('returns success', async () => {
        const { context, instance } = scene;
        // generate a test SSH public key (not real, just valid format)
        const testPublicKey =
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDtest123 declastruct-test';
        const result = await sdkEc2InstanceConnect.setSshPublicKey(
          {
            instanceId: instance.id,
            instanceOsUser: 'ec2-user',
            sshPublicKey: testPublicKey,
          },
          context,
        );
        expect(result.success).toBe(true);
        expect(result.requestId).toBeDefined();
      });
    });
  });

  given('[case4] sdkSsmSession', () => {
    when('[t0] getOneSessionHealth checks connectivity', () => {
      then('returns connected status', async () => {
        const { context, instance } = scene;
        const result = await sdkSsmSession.getOneSessionHealth(
          { instanceId: instance.id },
          context,
        );
        expect(result.instanceId).toBeDefined();
        expect(result.status).toBe('connected');
      });
    });

    when('[t1] setSession starts session', () => {
      then('returns session details', async () => {
        const { context, instance } = scene;
        const result = await sdkSsmSession.setSession(
          {
            instanceId: instance.id,
            reason: 'declastruct sdk integration test',
          },
          context,
        );
        expect(result.sessionId).toBeDefined();
        expect(result.streamUrl).toContain('wss://');
        expect(result.tokenValue).toBeDefined();
      });
    });

    when('[t2] getOneSessionHealth for nonexistent instance', () => {
      then('returns notconnected', async () => {
        const { context } = scene;
        const result = await sdkSsmSession.getOneSessionHealth(
          { instanceId: 'i-nonexistent12345' },
          context,
        );
        expect(result.status).toBe('notconnected');
      });
    });
  });
});
