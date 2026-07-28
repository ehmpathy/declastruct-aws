import { DescribeImagesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { HelpfulError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';

/**
 * .what = reads the real root device name of an EC2 AMI from AWS
 * .why = AWS matches a launch template's root-volume override to a block device
 *   BY NAME, and that name is AMI-specific (amazon-linux /dev/xvda, ubuntu
 *   /dev/sda1). the authoritative name is the AMI's own RootDeviceName.
 * .note = returns null when AWS returns an image with no RootDeviceName; the
 *   caller decides how to fail loud. a describe-call fault is wrapped with
 *   context and rethrown (repo convention) — it surfaces loudly, never
 *   swallowed (rule.forbid.failhide, rule.prefer.helpful-error-wrap).
 */
export const getEc2ImageRootDeviceName = async (
  input: { imageId: string },
  context: ContextAwsApi & ContextLogTrail,
): Promise<string | null> => {
  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // read the AMI's authoritative root device name (id-scoped → at most one image)
  try {
    const imagesResponse = await ec2.send(
      new DescribeImagesCommand({ ImageIds: [input.imageId] }),
    );
    return imagesResponse.Images?.[0]?.RootDeviceName ?? null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata;
    throw new HelpfulError('aws.getEc2ImageRootDeviceName error', {
      cause: error,
      context: {
        errorName: error.name,
        errorMessage: error.message,
        httpStatusCode: metadata?.httpStatusCode,
        input,
      },
    });
  }
};
