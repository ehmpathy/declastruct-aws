import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getOneEc2SshKeyAuthorizedByUnique } from './getOneEc2SshKeyAuthorizedByUnique';

/**
 * .what = ci clamp for the headline decision wire-up (param recorded-id vs live box id)
 * .why = the pure isEc2SshKeyAuthorizedStale unit proves the compare in isolation, but it
 *        cannot catch a WIRE-UP defect in this orchestrator — a swapped recorded/live arg,
 *        the wrong field read off the param, the wrong exid threaded into the lookup. those
 *        are exactly the regressions a pure-function test structurally cannot see. the
 *        real-infra integration case is ci-gated, so this mocked clamp is the durable ci
 *        guard for the rebuild decision. mocks SSMClient + EC2Client — no real infra.
 */
const ssmMock = mockClient(SSMClient);
const ec2Mock = mockClient(EC2Client);
const mockContext = getMockedAwsApiContext();

// a valid tracked-param value, recorded against a given instance-id
const genParamValue = (instanceId: string): string =>
  JSON.stringify({
    publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 test@box',
    fingerprint: 'SHA256:abc123',
    authorizedAt: '2026-07-27T00:00:00.000Z',
    comment: 'vlad-pop-os',
    user: 'ec2-user',
    instanceId,
  });

const resolveParam = (instanceId: string): void => {
  ssmMock.on(GetParameterCommand).resolves({
    Parameter: {
      Name: '/declastruct/ec2/ssh-keys/grove-1/vlad-pop-os',
      Value: genParamValue(instanceId),
      Type: 'SecureString',
      Version: 1,
      ARN: 'arn:aws:ssm:us-east-1:123456789012:parameter/declastruct/ec2/ssh-keys/grove-1/vlad-pop-os',
      LastModifiedDate: new Date('2026-07-27T00:00:00.000Z'),
    },
  });
};

const resolveLiveInstance = (instanceId: string): void => {
  ec2Mock.on(DescribeInstancesCommand).resolves({
    Reservations: [
      { Instances: [{ InstanceId: instanceId, State: { Name: 'running' } }] },
    ],
  });
};

const uniqueInput = {
  by: { unique: { instance: { exid: 'grove-1' }, comment: 'vlad-pop-os' } },
};

describe('getOneEc2SshKeyAuthorizedByUnique', () => {
  beforeEach(() => {
    ssmMock.reset();
    ec2Mock.reset();
  });

  given(
    'the param records an instance-id that is NOT the live box (a rebuild)',
    () => {
      when('the key is looked up', () => {
        then('it returns null so reconcile decides CREATE', async () => {
          resolveParam('i-0old0000000000000'); // recorded against the pre-rebuild box
          resolveLiveInstance('i-0new0000000000000'); // fresh box, new id
          const result = await getOneEc2SshKeyAuthorizedByUnique(
            uniqueInput,
            mockContext,
          );
          expect(result).toBeNull();
        });
      });
    },
  );

  given(
    'the param records the SAME instance-id as the live box (no rebuild)',
    () => {
      when('the key is looked up', () => {
        then('it returns the authorized key (KEEP)', async () => {
          resolveParam('i-0same000000000000'); // recorded id
          resolveLiveInstance('i-0same000000000000'); // matches → same box
          const result = await getOneEc2SshKeyAuthorizedByUnique(
            uniqueInput,
            mockContext,
          );
          expect(result).not.toBeNull();
          expect(result?.publicKey).toContain('ssh-ed25519');
          expect(result?.comment).toEqual('vlad-pop-os');
          expect(result?.instance.exid).toEqual('grove-1');
        });
      });
    },
  );

  given('the tracked param is absent', () => {
    when('the key is looked up', () => {
      then('it returns null without a box lookup', async () => {
        ssmMock
          .on(GetParameterCommand)
          .rejects(
            new ParameterNotFound({ message: 'not found', $metadata: {} }),
          );
        const result = await getOneEc2SshKeyAuthorizedByUnique(
          uniqueInput,
          mockContext,
        );
        expect(result).toBeNull();
      });
    });
  });

  given('the param exists but the live box is gone (not yet recreated)', () => {
    when('the key is looked up', () => {
      then('it returns null (stale → CREATE)', async () => {
        resolveParam('i-0old0000000000000');
        ec2Mock.on(DescribeInstancesCommand).resolves({ Reservations: [] });
        const result = await getOneEc2SshKeyAuthorizedByUnique(
          uniqueInput,
          mockContext,
        );
        expect(result).toBeNull();
      });
    });
  });
});
