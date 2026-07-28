import { DescribeImagesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { mockClient } from 'aws-sdk-client-mock';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getMockedAwsApiContext } from '@src/.test/getMockedAwsApiContext';

import { getEc2ImageRootDeviceName } from './getEc2ImageRootDeviceName';

const ec2Mock = mockClient(EC2Client);

const context = getMockedAwsApiContext();

/**
 * .what = unit test for the AMI root-device-name read
 * .why = the launch template's root-volume override must target the AMI's real
 *   root device, whose name is read from DescribeImages(...).RootDeviceName.
 */
describe('getEc2ImageRootDeviceName', () => {
  beforeEach(() => {
    ec2Mock.reset();
  });

  given('an AMI whose real root device is /dev/sda1', () => {
    when('DescribeImages returns RootDeviceName /dev/sda1', () => {
      then('it returns /dev/sda1 and queries the given imageId', async () => {
        ec2Mock.on(DescribeImagesCommand).resolves({
          Images: [{ RootDeviceName: '/dev/sda1' }],
        });

        const rootDeviceName = await getEc2ImageRootDeviceName(
          { imageId: 'ami-ubuntu-2404' },
          context,
        );
        expect(rootDeviceName).toBe('/dev/sda1');

        const calls = ec2Mock.commandCalls(DescribeImagesCommand);
        expect(calls).toHaveLength(1);
        expect(calls[0]!.args[0]!.input).toEqual({
          ImageIds: ['ami-ubuntu-2404'],
        });
      });
    });
  });

  given('an AMI whose describe returns no RootDeviceName', () => {
    when('DescribeImages returns an image without a RootDeviceName', () => {
      then(
        'it returns null (the caller decides how to fail loud)',
        async () => {
          ec2Mock.on(DescribeImagesCommand).resolves({ Images: [{}] });

          const rootDeviceName = await getEc2ImageRootDeviceName(
            { imageId: 'ami-broken' },
            context,
          );
          expect(rootDeviceName).toBeNull();
        },
      );
    });
  });

  given('the DescribeImages call itself faults', () => {
    when('AWS rejects the describe (e.g. InvalidAMIID / AccessDenied)', () => {
      then(
        'the fault surfaces wrapped with context — never swallowed to null',
        async () => {
          ec2Mock
            .on(DescribeImagesCommand)
            .rejects(new Error('InvalidAMIID.NotFound: no such image'));

          const error = await getError(
            getEc2ImageRootDeviceName({ imageId: 'ami-absent' }, context),
          );
          // wrapped (repo convention), not swallowed: names the op, preserves
          // the cause, and correlates the imageId
          expect(error.message).toContain('getEc2ImageRootDeviceName');
          expect(error.message).toContain('InvalidAMIID.NotFound');
          expect(error.message).toContain('ami-absent');
        },
      );
    });
  });
});
