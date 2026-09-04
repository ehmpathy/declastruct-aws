import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  isRefByPrimary,
  isRefByUnique,
  type Ref,
  type RefByPrimary,
  type RefByUnique,
} from 'domain-objects';
import { HelpfulError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import { getAwsClientConfig } from '@src/access/sdks/getAwsClientConfig';
import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsEc2Instance } from '@src/domain.objects/DeclaredAwsEc2Instance';

/**
 * .what = gets ONLY the live primary ref (id) of an EC2 instance (by exid or id)
 * .why = a lean control-plane lookup for callers that need the identity alone — the
 *        marker for a rebuild compare — WITHOUT the cost of (or the failure surface
 *        of) the subnet + N×security-group resolution that the full `getEc2Instance`
 *        chains on. returns a RefByPrimary (not a bare string) so the identity leaves
 *        as a typed domain ref, symmetric with the input
 * .note
 *   - returns null (never hard-throws) when the box is absent/replaced/malformed, so
 *     a plan-time drift check degrades to CREATE rather than aborting the whole plan
 *     (see rule.forbid.in-guest-connection-for-drift-check — the compare is answered
 *     from this DescribeInstances alone, never a connection into the box)
 *   - excludes terminated/shutting-down boxes: a rebuilt box mints a new id, so the
 *     old id is correctly seen as absent
 */
export const getOneEc2InstanceId = async (
  input: {
    by: PickOne<{
      primary: RefByPrimary<typeof DeclaredAwsEc2Instance>;
      unique: RefByUnique<typeof DeclaredAwsEc2Instance>;
      ref: Ref<typeof DeclaredAwsEc2Instance>;
    }>;
  },
  context: ContextAwsApi & VisualogicContext,
): Promise<RefByPrimary<typeof DeclaredAwsEc2Instance> | null> => {
  // route ref to primary or unique
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

  // create ec2 client — bound requestTimeout so a stalled socket (a connect with no response)
  // aborts and adaptive-retries instead of a hang (rule.require.failfast)
  const ec2 = new EC2Client(
    getAwsClientConfig({ region: context.aws.credentials.region }),
  );

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

    // failfast if neither primary nor unique matched
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

    // return the live instance-id as a primary ref (the identity marker)
    return instance.InstanceId ? { id: instance.InstanceId } : null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    // handle not-found and malformed id errors as null
    if (error.name === 'InvalidInstanceID.NotFound') return null;
    if (error.name === 'InvalidInstanceID.Malformed') return null;

    // rethrow other errors with context
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata;
    throw new HelpfulError('aws.getOneEc2InstanceId error', {
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
