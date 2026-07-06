import { DescribeRouteTablesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { asProcedure } from 'as-procedure';
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
import { DeclaredAwsVpcRouteTable } from '@src/domain.objects/DeclaredAwsVpcRouteTable';
import { getEc2Instance } from '@src/domain.operations/ec2Instance/getEc2Instance';
import { getOneVpcExid } from '@src/domain.operations/vpc/getOneVpcExid';
import { getOneVpcInternetGateway } from '@src/domain.operations/vpcInternetGateway/getOneVpcInternetGateway';
import { getOneVpcSubnet } from '@src/domain.operations/vpcSubnet/getOneVpcSubnet';

import { castIntoDeclaredAwsVpcRouteTable } from './castIntoDeclaredAwsVpcRouteTable';

/**
 * .what = gets a single VPC route table from AWS
 * .why = enables lookup by primary (id) or unique (exid tag)
 */
export const getOneVpcRouteTable = asProcedure(
  async (
    input: {
      by: PickOne<{
        primary: RefByPrimary<typeof DeclaredAwsVpcRouteTable>;
        unique: RefByUnique<typeof DeclaredAwsVpcRouteTable>;
        ref: Ref<typeof DeclaredAwsVpcRouteTable>;
      }>;
    },
    context: ContextAwsApi & VisualogicContext,
  ): Promise<HasReadonly<typeof DeclaredAwsVpcRouteTable> | null> => {
    // handle by ref via type guards
    if (input.by.ref) {
      if (isRefByUnique({ of: DeclaredAwsVpcRouteTable })(input.by.ref))
        return getOneVpcRouteTable({ by: { unique: input.by.ref } }, context);
      if (isRefByPrimary({ of: DeclaredAwsVpcRouteTable })(input.by.ref))
        return getOneVpcRouteTable({ by: { primary: input.by.ref } }, context);
      UnexpectedCodePathError.throw('ref is neither unique nor primary', {
        input,
      });
    }

    // declare the client
    const ec2 = new EC2Client({
      region: context.aws.credentials.region,
    });

    // build filters based on lookup type
    const filters = (() => {
      if (input.by.primary)
        return [{ Name: 'route-table-id', Values: [input.by.primary.id] }];
      if (input.by.unique)
        return [{ Name: 'tag:exid', Values: [input.by.unique.exid] }];
      throw new UnexpectedCodePathError(
        'not referenced by primary nor unique. how not?',
        { input },
      );
    })();

    // execute the describe command
    const describeCommand = new DescribeRouteTablesCommand({
      Filters: filters,
    });

    try {
      const response = await ec2.send(describeCommand);

      // return null if no route tables found
      if (!response.RouteTables || response.RouteTables.length === 0)
        return null;

      const rt = response.RouteTables[0]!;

      // lookup VPC exid
      if (!rt.VpcId)
        UnexpectedCodePathError.throw('route table lacks vpc id', { rt });
      const vpcExid = await getOneVpcExid({ vpcId: rt.VpcId }, context);

      // build gateway exid lookup map (internet gateways and nat gateways)
      const gatewayIds = (rt.Routes ?? [])
        .filter((r) => r.GatewayId && r.GatewayId !== 'local')
        .map((r) => r.GatewayId!);

      const gatewaysLookup: Record<string, string> = {};
      for (const gatewayId of gatewayIds) {
        const igw = await getOneVpcInternetGateway(
          { by: { primary: { id: gatewayId } } },
          context,
        );
        if (!igw)
          UnexpectedCodePathError.throw(
            'internet gateway not found for exid lookup',
            { gatewayId },
          );
        gatewaysLookup[gatewayId] = igw.exid;
      }
      // note: nat gateways not yet supported, would need similar lookup

      // build subnet exid lookup map
      const subnetIds = (rt.Associations ?? [])
        .filter((a) => !a.Main && a.SubnetId)
        .map((a) => a.SubnetId!);

      const subnetsLookup: Record<string, string> = {};
      for (const subnetId of subnetIds) {
        const subnet = await getOneVpcSubnet(
          { by: { primary: { id: subnetId } } },
          context,
        );
        if (!subnet)
          UnexpectedCodePathError.throw('subnet not found for exid lookup', {
            subnetId,
          });
        subnetsLookup[subnetId] = subnet.exid;
      }

      // build nat instance exid lookup map (active routes only; blackhole routes
      // have no instance id and are filtered out by the cast)
      const instanceIds = (rt.Routes ?? [])
        .filter((r) => r.State !== 'blackhole' && r.InstanceId)
        .map((r) => r.InstanceId!);

      const instancesLookup: Record<string, string> = {};
      for (const instanceId of instanceIds) {
        const instance = await getEc2Instance(
          { by: { primary: { id: instanceId } } },
          context,
        );
        if (!instance)
          UnexpectedCodePathError.throw(
            'ec2 instance not found for exid lookup',
            { instanceId },
          );
        instancesLookup[instanceId] = instance.exid;
      }

      // cast and return
      return castIntoDeclaredAwsVpcRouteTable(rt, {
        vpc: vpcExid,
        gateways: gatewaysLookup,
        subnets: subnetsLookup,
        instances: instancesLookup,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;

      // handle route table not found
      if (error.name === 'InvalidRouteTableID.NotFound') return null;
      const metadata = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata;
      if (metadata?.httpStatusCode === 404) return null;

      throw new HelpfulError('aws.getOneVpcRouteTable error', {
        cause: error,
        context: {
          errorName: error.name,
          errorMessage: error.message,
          httpStatusCode: metadata?.httpStatusCode,
          input,
        },
      });
    }
  },
);
