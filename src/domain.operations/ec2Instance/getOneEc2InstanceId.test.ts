import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getOneEc2InstanceId } from './getOneEc2InstanceId';

/**
 * .what = unit clamp for the lean instance-id lookup
 * .why = both the ssh-key get (stale-check) and set depend on this for their identity
 *        compare; it MUST degrade to null (never hard-throw) on an absent/replaced box,
 *        so a plan-time drift check reconciles to CREATE instead of an abort of the plan
 *        (rule.forbid.in-guest-connection-for-drift-check). mocks EC2Client so the
 *        degrade + collision paths run in ci with no real infra.
 */
const ec2Mock = mockClient(EC2Client);
const mockContext = getMockedAwsApiContext();

describe('getOneEc2InstanceId', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  given('a box exists with an exid tag', () => {
    when('looked up by unique exid', () => {
      then('it returns the live instance-id', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [{ InstanceId: 'i-123', State: { Name: 'running' } }],
            },
          ],
        });
        const ref = await getOneEc2InstanceId(
          { by: { unique: { exid: 'test-box' } } },
          mockContext,
        );
        expect(ref).toEqual({ id: 'i-123' });
      });
    });
  });

  given('a box exists with a primary id', () => {
    when('looked up by primary id', () => {
      then('it returns the live instance-id', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [{ InstanceId: 'i-abc', State: { Name: 'stopped' } }],
            },
          ],
        });
        const ref = await getOneEc2InstanceId(
          { by: { primary: { id: 'i-abc' } } },
          mockContext,
        );
        expect(ref).toEqual({ id: 'i-abc' });
      });
    });
  });

  given('no box exists', () => {
    when('looked up', () => {
      then('it degrades to null (no throw)', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
        const id = await getOneEc2InstanceId(
          { by: { unique: { exid: 'absent' } } },
          mockContext,
        );
        expect(id).toBeNull();
      });
    });
  });

  given('only a terminated box is returned', () => {
    when('looked up', () => {
      then(
        'it excludes it and returns null (a rebuild reads absent)',
        async () => {
          ec2Mock.on(DescribeInstancesCommand).resolves({
            Reservations: [
              {
                Instances: [
                  { InstanceId: 'i-dead', State: { Name: 'terminated' } },
                ],
              },
            ],
          });
          const id = await getOneEc2InstanceId(
            { by: { unique: { exid: 'rebuilt' } } },
            mockContext,
          );
          expect(id).toBeNull();
        },
      );
    });
  });

  given('two boxes share the exid', () => {
    when('looked up', () => {
      then('it fails loud on the collision', async () => {
        ec2Mock.on(DescribeInstancesCommand).resolves({
          Reservations: [
            {
              Instances: [
                { InstanceId: 'i-1', State: { Name: 'running' } },
                { InstanceId: 'i-2', State: { Name: 'running' } },
              ],
            },
          ],
        });
        await expect(
          getOneEc2InstanceId({ by: { unique: { exid: 'dup' } } }, mockContext),
        ).rejects.toThrow('multiple ec2 instances found');
      });
    });
  });

  given('aws throws InvalidInstanceID.NotFound', () => {
    when('looked up', () => {
      then('it degrades to null', async () => {
        const notFound = new Error('not found');
        notFound.name = 'InvalidInstanceID.NotFound';
        ec2Mock.on(DescribeInstancesCommand).rejects(notFound);
        const id = await getOneEc2InstanceId(
          { by: { primary: { id: 'i-gone' } } },
          mockContext,
        );
        expect(id).toBeNull();
      });
    });
  });

  given('aws throws InvalidInstanceID.Malformed', () => {
    when('looked up', () => {
      then('it degrades to null', async () => {
        const malformed = new Error('malformed');
        malformed.name = 'InvalidInstanceID.Malformed';
        ec2Mock.on(DescribeInstancesCommand).rejects(malformed);
        const id = await getOneEc2InstanceId(
          { by: { primary: { id: 'bad' } } },
          mockContext,
        );
        expect(id).toBeNull();
      });
    });
  });

  given('aws throws an unknown error', () => {
    when('looked up', () => {
      then('it wraps and rethrows (never a silent null)', async () => {
        const boom = new Error('throttled');
        boom.name = 'ThrottlingException';
        ec2Mock.on(DescribeInstancesCommand).rejects(boom);
        await expect(
          getOneEc2InstanceId({ by: { unique: { exid: 'x' } } }, mockContext),
        ).rejects.toThrow('aws.getOneEc2InstanceId error');
      });
    });
  });
});
