import type { RouteTable } from '@aws-sdk/client-ec2';
import { type HasReadonly, hasReadonly } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';
import { assure } from 'type-fns';

import type { DeclaredAwsVpcRoute } from '@src/domain.objects/DeclaredAwsVpcRoute';
import { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
import type { DeclaredAwsVpcRouteTableAssociation } from '@src/domain.objects/DeclaredAwsVpcRouteTableAssociation';

/**
 * .what = casts an AWS SDK RouteTable to a DeclaredAwsVpcRouteTable
 * .why = maps AWS response shape to domain object
 *
 * @param input - the AWS SDK RouteTable response
 * @param exidLookup - maps for AWS ids to exids (looked up by caller)
 */
export const castIntoDeclaredAwsVpcRouteTable = (
  input: RouteTable,
  exidLookup: {
    vpc: string;
    gateways: Record<string, string>; // gatewayId -> exid
    subnets: Record<string, string>; // subnetId -> exid
    instances: Record<string, string>; // instanceId -> exid
  },
): HasReadonly<typeof DeclaredAwsVpcRouteTable> => {
  // extract exid from tags
  const exidTag = input.Tags?.find((tag) => tag.Key === 'exid');

  // failfast if exid tag is not defined
  if (!exidTag?.Value)
    UnexpectedCodePathError.throw(
      'route table lacks exid tag; cannot cast to domain object',
      { input },
    );

  // failfast if route table id is not defined
  if (!input.RouteTableId)
    UnexpectedCodePathError.throw(
      'route table lacks id; cannot cast to domain object',
      { input },
    );

  // failfast if vpc id is not defined
  if (!input.VpcId)
    UnexpectedCodePathError.throw(
      'route table lacks vpc id; cannot cast to domain object',
      { input },
    );

  // cast routes
  const routes: DeclaredAwsVpcRoute[] = (input.Routes ?? [])
    // exclude the AWS-managed local route
    .filter((route) => route.GatewayId !== 'local')
    // exclude blackhole routes (dead artifacts, e.g. a terminated nat instance —
    // AWS drops the instance id but keeps the route until manually removed)
    .filter((route) => route.State !== 'blackhole')
    .map((route) => {
      // determine destination cidr
      const destination: DeclaredAwsVpcRoute['destination'] = {
        cidr: {
          ...(route.DestinationCidrBlock && { v4: route.DestinationCidrBlock }),
          ...(route.DestinationIpv6CidrBlock && {
            v6: route.DestinationIpv6CidrBlock,
          }),
        },
      };

      // determine target (internet gateway, nat gateway, or nat instance)
      const target: DeclaredAwsVpcRoute['target'] = (() => {
        // nat gateways are not managed by declastruct, so we use raw AWS id
        if (route.NatGatewayId) {
          return { gatewayNat: { id: route.NatGatewayId } };
        }
        // nat instance (fck-nat) — look up the instance exid from its id so a
        // declared ref and this remote route compare equal (no false drift)
        if (route.InstanceId) {
          const exid = exidLookup.instances[route.InstanceId];
          if (!exid)
            throw new UnexpectedCodePathError(
              'nat instance exid not found in lookup',
              { instanceId: route.InstanceId },
            );
          return { instanceNat: { instance: { exid } } };
        }
        if (route.GatewayId) {
          const exid = exidLookup.gateways[route.GatewayId];
          if (!exid)
            throw new UnexpectedCodePathError(
              'internet gateway exid not found in lookup',
              { gatewayId: route.GatewayId },
            );
          return { gatewayInternet: { exid } };
        }

        // failfast if no recognized target
        throw new UnexpectedCodePathError(
          'route has no recognized target; only internet gateway, nat gateway, and nat instance are supported',
          { route },
        );
      })();

      return { destination, target };
    });

  // cast associations (filter out main association)
  const associations: DeclaredAwsVpcRouteTableAssociation[] = (
    input.Associations ?? []
  )
    .filter((assoc) => !assoc.Main) // exclude main association
    .filter((assoc) => assoc.SubnetId) // only include subnet associations
    .map((assoc) => {
      const subnetExid = exidLookup.subnets[assoc.SubnetId!];
      if (!subnetExid)
        throw new UnexpectedCodePathError('subnet exid not found in lookup', {
          subnetId: assoc.SubnetId,
        });
      return { subnet: { exid: subnetExid } };
    });

  // parse tags (only include if present)
  const tags = input.Tags?.length
    ? Object.fromEntries(
        input.Tags.filter(
          (tag) => tag.Key && tag.Value && tag.Key !== 'exid',
        ).map((tag) => [tag.Key!, tag.Value!]),
      )
    : null;

  // cast and assure metadata fields are present
  return assure(
    DeclaredAwsVpcRouteTable.as({
      id: input.RouteTableId,
      exid: exidTag.Value,
      vpc: { exid: exidLookup.vpc },
      routes,
      associations,
      tags: tags && Object.keys(tags).length > 0 ? tags : null,
    }),
    hasReadonly({ of: DeclaredAwsVpcRouteTable }),
  );
};
