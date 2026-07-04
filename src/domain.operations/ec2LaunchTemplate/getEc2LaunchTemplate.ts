import {
  DescribeLaunchTemplatesCommand,
  type DescribeLaunchTemplatesCommandOutput,
  DescribeLaunchTemplateVersionsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import type { HasReadonly } from 'domain-objects';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'sdk-logs';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2LaunchTemplate } from '@src/domain.objects/DeclaredAwsEc2LaunchTemplate';

import { castIntoDeclaredAwsEc2LaunchTemplate } from './castIntoDeclaredAwsEc2LaunchTemplate';

/**
 * .what = retrieves an EC2 launch template from AWS
 * .why = enables lookup by primary (id) or unique (exid)
 */
export const getEc2LaunchTemplate = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsEc2LaunchTemplate>;
      unique: RefByUnique<typeof DeclaredAwsEc2LaunchTemplate>;
      ref: Ref<typeof DeclaredAwsEc2LaunchTemplate>;
    }>;
  },
  context: ContextAwsApi & ContextLogTrail,
): Promise<HasReadonly<typeof DeclaredAwsEc2LaunchTemplate> | null> => {
  // route ref to primary or unique
  const by = await (async () => {
    // passthrough if not ref
    if (!input.by.ref) return input.by;

    // route to unique if ref is by unique
    if (isRefByUnique({ of: DeclaredAwsEc2LaunchTemplate })(input.by.ref))
      return { unique: input.by.ref };

    // route to primary if ref is by primary
    if (isRefByPrimary({ of: DeclaredAwsEc2LaunchTemplate })(input.by.ref))
      return { primary: input.by.ref };

    // failfast if ref is neither unique nor primary
    return UnexpectedCodePathError.throw('ref is neither unique nor primary', {
      input,
    });
  })();

  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // query launch template
  let response: DescribeLaunchTemplatesCommandOutput;
  try {
    response = await ec2.send(
      new DescribeLaunchTemplatesCommand(
        by.primary
          ? { LaunchTemplateIds: [by.primary.id] }
          : { Filters: [{ Name: 'tag:exid', Values: [by.unique!.exid] }] },
      ),
    );
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.name === 'InvalidLaunchTemplateId.NotFound') return null;
    if (error.name === 'InvalidLaunchTemplateId.Malformed') return null;
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata;
    throw new HelpfulError('aws.getEc2LaunchTemplate error', {
      cause: error,
      context: {
        errorName: error.name,
        errorMessage: error.message,
        httpStatusCode: metadata?.httpStatusCode,
        input,
      },
    });
  }

  // return null if not found
  const template = response.LaunchTemplates?.[0];
  if (!template || !template.LaunchTemplateId) return null;

  // get $Latest version for template data
  const versionResponse = await ec2.send(
    new DescribeLaunchTemplateVersionsCommand({
      LaunchTemplateId: template.LaunchTemplateId,
      Versions: ['$Latest'],
    }),
  );

  const latestVersion = versionResponse.LaunchTemplateVersions?.[0];
  if (!latestVersion?.LaunchTemplateData) return null;

  // cast to domain format
  return castIntoDeclaredAwsEc2LaunchTemplate({
    id: template.LaunchTemplateId,
    data: latestVersion.LaunchTemplateData,
    tags: template.Tags,
  });
};
