import type { RouteTable } from '@aws-sdk/client-ec2';
import { getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { castIntoDeclaredAwsVpcRouteTable } from './castIntoDeclaredAwsVpcRouteTable';

describe('castIntoDeclaredAwsVpcRouteTable', () => {
  given('an AWS RouteTable with all properties', () => {
    when('cast to domain object', () => {
      then('it should cast with all properties mapped', () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-1234567890abcdef0',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationCidrBlock: '10.0.0.0/16',
              GatewayId: 'local',
              State: 'active',
            },
            {
              DestinationCidrBlock: '0.0.0.0/0',
              GatewayId: 'igw-abc123',
              State: 'active',
            },
          ],
          Associations: [
            {
              RouteTableAssociationId: 'rtbassoc-main',
              RouteTableId: 'rtb-1234567890abcdef0',
              Main: true,
            },
            {
              RouteTableAssociationId: 'rtbassoc-subnet',
              RouteTableId: 'rtb-1234567890abcdef0',
              SubnetId: 'subnet-abc123',
              Main: false,
            },
          ],
          Tags: [
            { Key: 'exid', Value: 'test-route-table' },
            { Key: 'managedBy', Value: 'declastruct' },
          ],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: { 'igw-abc123': 'test-igw-exid' },
          subnets: { 'subnet-abc123': 'test-subnet-exid' },
        });
        expect(result).toMatchObject({
          id: 'rtb-1234567890abcdef0',
          exid: 'test-route-table',
          vpc: { exid: 'test-vpc-exid' },
          routes: [
            {
              destination: { cidr: { v4: '0.0.0.0/0' } },
              target: { gatewayInternet: { exid: 'test-igw-exid' } },
            },
          ],
          associations: [{ subnet: { exid: 'test-subnet-exid' } }],
          tags: { managedBy: 'declastruct' },
        });
      });
    });
  });

  given('an AWS RouteTable without exid tag', () => {
    when('cast to domain object', () => {
      then('it should throw UnexpectedCodePathError', async () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-abc',
          VpcId: 'vpc-abc123',
          Tags: [{ Key: 'Name', Value: 'some-name' }],
        };
        const error = await getError(() =>
          castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
            vpc: 'test-vpc-exid',
            gateways: {},
            subnets: {},
          }),
        );
        expect(error.message).toContain('route table lacks exid tag');
      });
    });
  });

  given('an AWS RouteTable with NAT gateway route', () => {
    when('cast to domain object', () => {
      then('it should cast NAT gateway target', () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-nat',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationCidrBlock: '0.0.0.0/0',
              NatGatewayId: 'nat-abc123',
              State: 'active',
            },
          ],
          Associations: [],
          Tags: [{ Key: 'exid', Value: 'nat-route-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: {},
          subnets: {},
        });
        // nat gateways are not managed by declastruct, so use raw AWS id
        expect(result.routes[0]).toMatchObject({
          destination: { cidr: { v4: '0.0.0.0/0' } },
          target: { gatewayNat: { id: 'nat-abc123' } },
        });
      });
    });
  });

  given('an AWS RouteTable with IPv6 route', () => {
    when('cast to domain object', () => {
      then('it should cast IPv6 destination', () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-ipv6',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationIpv6CidrBlock: '::/0',
              GatewayId: 'igw-abc123',
              State: 'active',
            },
          ],
          Associations: [],
          Tags: [{ Key: 'exid', Value: 'ipv6-route-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: { 'igw-abc123': 'test-igw-exid' },
          subnets: {},
        });
        expect(result.routes[0]).toMatchObject({
          destination: { cidr: { v6: '::/0' } },
          target: { gatewayInternet: { exid: 'test-igw-exid' } },
        });
      });
    });
  });

  given('an AWS RouteTable with only local routes', () => {
    when('cast to domain object', () => {
      then('it should cast with empty routes', () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-local',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationCidrBlock: '10.0.0.0/16',
              GatewayId: 'local',
              State: 'active',
            },
          ],
          Associations: [],
          Tags: [{ Key: 'exid', Value: 'local-only-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: {},
          subnets: {},
        });
        expect(result.routes).toEqual([]);
      });
    });
  });

  given('an AWS RouteTable with only main association', () => {
    when('cast to domain object', () => {
      then('it should cast with empty associations', () => {
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-main',
          VpcId: 'vpc-abc123',
          Routes: [],
          Associations: [
            {
              RouteTableAssociationId: 'rtbassoc-main',
              RouteTableId: 'rtb-main',
              Main: true,
            },
          ],
          Tags: [{ Key: 'exid', Value: 'main-only-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: {},
          subnets: {},
        });
        expect(result.associations).toEqual([]);
      });
    });
  });
});
