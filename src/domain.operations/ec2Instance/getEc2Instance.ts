import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  type HasReadonly,
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import type { ContextLogTrail } from 'simple-log-methods';
import type { PickOne } from 'type-fns';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

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
  context: ContextAwsApi & ContextLogTrail,
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

  // build command based on lookup method
  const command = (() => {
    // lookup by primary (instance id)
    if (by.primary)
      return new DescribeInstancesCommand({
        InstanceIds: [by.primary.id],
      });

    // lookup by unique (exid tag)
    if (by.unique)
      return new DescribeInstancesCommand({
        Filters: [{ Name: 'tag:exid', Values: [by.unique.exid] }],
      });

    // failfast if neither primary nor unique resolved
    return UnexpectedCodePathError.throw(
      'not referenced by primary nor unique. how not?',
      { input },
    );
  })();

  // send command
  const response = await ec2.send(command);

  // extract instances from response
  const [instance, ...collisions] =
    response.Reservations?.flatMap((r) => r.Instances ?? []) ?? [];
  if (!instance) return null;

  // failfast if more than one instance found
  if (collisions.length)
    UnexpectedCodePathError.throw(
      'multiple ec2 instances found; expected exactly one',
      { input, count: collisions.length + 1 },
    );

  return castIntoDeclaredAwsEc2Instance(instance);
};
