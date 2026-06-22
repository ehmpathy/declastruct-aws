import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';
import { getOneVpcSecurityGroup } from '@src/domain.operations/vpcSecurityGroup/getOneVpcSecurityGroup';
import { getOneVpcSubnet } from '@src/domain.operations/vpcSubnet/getOneVpcSubnet';

import { castIntoDeclaredAwsEc2Instance } from './castIntoDeclaredAwsEc2Instance';

/**
 * .what = gets an EC2 instance from AWS
 * .why = enables lookup of EC2 instances by tag or instance id
 */
export const getEc2Instance = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsEc2Instance>;
      unique: RefByUnique<typeof DeclaredAwsEc2Instance>;
      ref: Ref<typeof DeclaredAwsEc2Instance>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<HasReadonly<typeof DeclaredAwsEc2Instance> | null> => {
  // resolve ref to primary or unique
  const by = await (async () => {
    // passthrough if not ref
    if (!input.by.ref) return input.by;

    // route to unique if ref is by unique
    if (isRefByUnique({ of: DeclaredAwsEc2Instance })(input.by.ref))
      return { unique: input.by.ref };

    // route to primary if ref is by primary
    if (isRefByPrimary({ of: DeclaredAwsEc2Instance })(input.by.ref))
      return { primary: input.by.ref };

    // failfast if ref is neither unique nor primary
    return UnexpectedCodePathError.throw('ref is neither unique nor primary', {
      input,
    });
  })();

  // create ec2 client
  const ec2 = new EC2Client({ region: context.aws.credentials.region });

  // filter to exclude terminated instances (they lose subnet/sg info)
  const excludeTerminatedFilter = {
    Name: 'instance-state-name',
    Values: ['pending', 'running', 'stopping', 'stopped'],
  };

  // build command based on lookup method
  const command = (() => {
    // lookup by primary (instance id)
    if (by.primary)
      return new DescribeInstancesCommand({
        InstanceIds: [by.primary.id],
        Filters: [excludeTerminatedFilter],
      });

    // lookup by unique (exid tag)
    if (by.unique)
      return new DescribeInstancesCommand({
        Filters: [
          { Name: 'tag:exid', Values: [by.unique.exid] },
          excludeTerminatedFilter,
        ],
      });

    // failfast if neither primary nor unique resolved
    return UnexpectedCodePathError.throw(
      'not referenced by primary nor unique. how not?',
      { input },
    );
  })();

  // send command and handle not-found cases
  try {
    const response = await ec2.send(command);

    // extract instances from response, exclude terminated states
    // note: filter in API should exclude these but AWS has eventual consistency
    const [instance, ...collisions] = (
      response.Reservations?.flatMap((r) => r.Instances ?? []) ?? []
    ).filter(
      (i) =>
        i.State?.Name !== 'terminated' && i.State?.Name !== 'shutting-down',
    );
    if (!instance) return null;

    // failfast if more than one instance found
    if (collisions.length)
      UnexpectedCodePathError.throw(
        'multiple ec2 instances found; expected exactly one',
        { input, count: collisions.length + 1 },
      );

    // lookup subnet exid
    if (!instance.SubnetId)
      UnexpectedCodePathError.throw('ec2 instance lacks subnet id', {
        instance,
      });
    const subnet = await getOneVpcSubnet(
      { by: { primary: { id: instance.SubnetId } } },
      context,
    );
    if (!subnet)
      UnexpectedCodePathError.throw('subnet not found for ec2 instance', {
        subnetId: instance.SubnetId,
      });

    // lookup security group exids
    const securityGroupIds = (instance.SecurityGroups ?? [])
      .map((sg) => sg.GroupId)
      .filter((id): id is string => id !== undefined);
    const securityGroupExids = await Promise.all(
      securityGroupIds.map(async (id) => {
        const sg = await getOneVpcSecurityGroup(
          { by: { primary: { id } } },
          context,
        );
        if (!sg)
          UnexpectedCodePathError.throw(
            'security group not found for ec2 instance',
            { securityGroupId: id },
          );
        return sg.exid;
      }),
    );

    // lookup launch template exid from instance tags
    const templateExidTag = instance.Tags?.find(
      (tag) => tag.Key === 'templateExid',
    );
    const templateExid = templateExidTag?.Value ?? null;

    return castIntoDeclaredAwsEc2Instance({
      instance,
      subnetExid: subnet.exid,
      securityGroupExids,
      templateExid,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // handle not-found and malformed id errors as null
    if (error.name === 'InvalidInstanceID.NotFound') return null;
    if (error.name === 'InvalidInstanceID.Malformed') return null;

    // rethrow other errors with context
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata;
    throw new HelpfulError('aws.getEc2Instance error', {
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
