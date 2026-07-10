import {
  CreateSubnetCommand,
  CreateTagsCommand,
  DescribeSubnetsCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
import type { HasReadonly } from 'domain-objects';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';
import type { VisualogicContext } from 'visualogic';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import type { DeclaredAwsVpcSubnet } from '@src/domain.objects/DeclaredAwsVpcSubnet';
import { getOneVpcId } from '@src/domain.operations/vpc/getOneVpcId';
import { getResourceOwnershipVerdict } from '@src/infra/ownership/getResourceOwnershipVerdict';

import { getOneVpcSubnet } from './getOneVpcSubnet';

/**
 * .what = adopts a pre-extant subnet that already occupies the desired (vpc, cidr),
 *   but ONLY when that subnet is unowned — never when a different exid owns it
 * .why = a create can fail with `InvalidSubnet.Conflict` when a subnet already holds
 *   the cidr in the vpc but lacks our `exid` tag (an orphan from a prior partial run) —
 *   so getOneVpcSubnet (which matches only on the exid tag) reports "not found" and the
 *   plan says CREATE, yet AWS rejects the create. rather than fail flake, we adopt: find
 *   the orphan by its natural key (vpc + cidr) and tag it with our exid so future
 *   lookups match. this makes the set idempotent against orphaned subnets
 * .note
 *   - scoped to the exact (vpc, cidr) we intended to create, so we only ever adopt the
 *     subnet that structurally IS the one we meant to make
 *   - (vpc, cidr) is a SUBSET of identity — a subnet that holds a DIFFERENT exid is a
 *     foreign owner, not our orphan. we must NOT retag it (that silently steals another
 *     declaration's subnet). so we classify the extant exid tag and fail loud on a
 *     foreign owner — see rule.forbid.silent-resource-theft
 */
const adoptConflictedSubnet = async (input: {
  ec2: EC2Client;
  vpcId: string;
  cidr: string;
  exid: string;
}): Promise<string> => {
  // find the subnet that already holds this cidr in this vpc
  const describeResponse = await input.ec2.send(
    new DescribeSubnetsCommand({
      Filters: [
        { Name: 'vpc-id', Values: [input.vpcId] },
        { Name: 'cidr-block', Values: [input.cidr] },
      ],
    }),
  );
  const subnetOrphan = describeResponse.Subnets?.[0];
  if (!subnetOrphan?.SubnetId)
    return UnexpectedCodePathError.throw(
      'subnet create conflicted but no subnet holds the cidr in the vpc',
      { vpcId: input.vpcId, cidr: input.cidr },
    );

  // classify the extant subnet's ownership before we touch it. the exid tag is the
  // ownership marker; a foreign one means another declaration owns this subnet
  const exidDetected = subnetOrphan.Tags?.find(
    (tag) => tag.Key === 'exid',
  )?.Value;
  const verdict = getResourceOwnershipVerdict({
    exidDetected,
    exidExpected: input.exid,
  });

  // fail loud on a foreign owner — never overrule another declaration's claim
  if (verdict === 'foreign')
    BadRequestError.throw(
      `a subnet already holds ${input.cidr} in ${input.vpcId}, owned by exid="${exidDetected}". it cannot be adopted for exid="${input.exid}". fix by one of: delete the extant subnet then re-apply, reconcile the two declarations to a single exid, or choose a free cidr`,
      {
        vpcId: input.vpcId,
        cidr: input.cidr,
        exidDetected,
        exidExpected: input.exid,
        subnetId: subnetOrphan.SubnetId,
      },
    );

  // unowned (or already ours) — safe to adopt. tag it with our exid, so
  // getOneVpcSubnet matches it on the next lookup
  await input.ec2.send(
    new CreateTagsCommand({
      Resources: [subnetOrphan.SubnetId],
      Tags: [{ Key: 'exid', Value: input.exid }],
    }),
  );

  return subnetOrphan.SubnetId;
};

/**
 * .what = creates or updates a VPC subnet
 * .why = enables declarative subnet management with tags
 *
 * .note
 *   - findsert: creates if not found, returns foundBefore if found
 *   - upsert: creates if not found, updates tags if found
 *   - CIDR and AZ cannot be changed after creation (AWS limitation)
 */
export const setVpcSubnet = asProcedure(
  async (
    input: PickOne<{
      findsert: DeclaredAwsVpcSubnet;
      upsert: DeclaredAwsVpcSubnet;
    }>,
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcSubnet>> => {
    const subnetDesired = input.findsert ?? input.upsert;

    // create client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // check if subnet already exists
    const foundBefore = await getOneVpcSubnet(
      { by: { unique: { exid: subnetDesired.exid } } },
      context,
    );

    // handle findsert: if found, return it
    if (foundBefore && input.findsert) return foundBefore;

    // create subnet if not found, otherwise use extant id
    const subnetId = await (async (): Promise<string> => {
      if (foundBefore) return foundBefore.id;

      // lookup VPC id from ref
      const vpcId = await getOneVpcId({ vpc: subnetDesired.vpc }, context);

      // failfast if cidr.v4 is not defined (required for subnet creation)
      const cidrV4 =
        subnetDesired.cidr.v4 ??
        UnexpectedCodePathError.throw(
          'subnet cidr.v4 is required for creation',
          { subnetDesired },
        );

      // attempt the create; on a cidr conflict, adopt the pre-extant subnet instead
      try {
        const createResponse = await ec2.send(
          new CreateSubnetCommand({
            VpcId: vpcId,
            CidrBlock: cidrV4,
            AvailabilityZone: subnetDesired.zone.availability,
            TagSpecifications: [
              {
                ResourceType: 'subnet',
                Tags: [
                  { Key: 'exid', Value: subnetDesired.exid },
                  ...(subnetDesired.tags
                    ? Object.entries(subnetDesired.tags).map(
                        ([key, value]) => ({ Key: key, Value: value }),
                      )
                    : []),
                ],
              },
            ],
          }),
        );

        // failfast if subnet id is absent
        if (!createResponse.Subnet?.SubnetId)
          return UnexpectedCodePathError.throw('subnet lacks id after create', {
            createResponse,
          });

        return createResponse.Subnet.SubnetId;
      } catch (error) {
        // only handle the cidr-conflict case: a subnet already holds this cidr in the
        // vpc but lacks our exid tag. adopt it (tag + reuse). rethrow all else
        if (
          !(error instanceof Error) ||
          error.name !== 'InvalidSubnet.Conflict'
        )
          throw error;
        return adoptConflictedSubnet({
          ec2,
          vpcId,
          cidr: cidrV4,
          exid: subnetDesired.exid,
        });
      }
    })();

    // update tags if upsert on extant
    if (foundBefore && input.upsert && subnetDesired.tags) {
      await ec2.send(
        new CreateTagsCommand({
          Resources: [subnetId],
          Tags: Object.entries(subnetDesired.tags).map(([key, value]) => ({
            Key: key,
            Value: value,
          })),
        }),
      );
    }

    // fetch and return the subnet
    const foundAfter = await getOneVpcSubnet(
      { by: { unique: { exid: subnetDesired.exid } } },
      context,
    );

    // failfast if not found after set
    if (!foundAfter)
      UnexpectedCodePathError.throw('subnet not found after set', {
        subnetDesired,
      });

    return foundAfter;
  },
);
