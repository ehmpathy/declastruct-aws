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
          instances: {},
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
            instances: {},
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
          instances: {},
        });
        // nat gateways are not managed by declastruct, so use raw AWS id
        expect(result.routes[0]).toMatchObject({
          destination: { cidr: { v4: '0.0.0.0/0' } },
          target: { gatewayNat: { id: 'nat-abc123' } },
        });
      });
    });
  });

  given('an AWS RouteTable with NAT instance (fck-nat) route', () => {
    when('cast to domain object', () => {
      then('it should cast a nat instance target referenced by exid', () => {
        // note: fck-nat routes carry an InstanceId; the cast looks up its exid
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-nat-instance',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationCidrBlock: '0.0.0.0/0',
              InstanceId: 'i-0b9746c0444d7cee5',
              InstanceOwnerId: '805192865516',
              NetworkInterfaceId: 'eni-0ab2243cfbf6897e0',
              Origin: 'CreateRoute',
              State: 'active',
            },
          ],
          Associations: [],
          Tags: [{ Key: 'exid', Value: 'nat-instance-route-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: {},
          subnets: {},
          instances: { 'i-0b9746c0444d7cee5': 'declastruct-acceptance-nat' },
        });
        // the route references the nat instance by its exid (looked up from id)
        expect(result.routes[0]).toMatchObject({
          destination: { cidr: { v4: '0.0.0.0/0' } },
          target: {
            instanceNat: { instance: { exid: 'declastruct-acceptance-nat' } },
          },
        });
      });
    });
  });

  given('an AWS RouteTable with a blackhole route', () => {
    when('cast to domain object', () => {
      then('it should drop the dead route', () => {
        // note: a terminated nat instance leaves a blackhole route — AWS drops
        //       the InstanceId and the route forwards no packets, so the cast
        //       filters it out
        const awsRouteTable: RouteTable = {
          RouteTableId: 'rtb-blackhole',
          VpcId: 'vpc-abc123',
          Routes: [
            {
              DestinationCidrBlock: '0.0.0.0/0',
              NetworkInterfaceId: 'eni-0ab2243cfbf6897e0',
              Origin: 'CreateRoute',
              State: 'blackhole',
            },
          ],
          Associations: [],
          Tags: [{ Key: 'exid', Value: 'blackhole-route-table' }],
        };
        const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
          vpc: 'test-vpc-exid',
          gateways: {},
          subnets: {},
          instances: {},
        });
        expect(result.routes).toEqual([]);
      });
    });
  });

  given(
    'an AWS RouteTable with an active route to a just-terminated NAT (not in lookup)',
    () => {
      // note: AWS lags to mark a route 'blackhole' after its NAT terminates, so the route
      //   reads 'active' with a dead InstanceId that resolves to no exid. the cast must DROP
      //   it (same as a blackhole), NOT throw — a throw here aborts the whole plan mid-reapply
      when('cast to domain object', () => {
        then('it should drop the dead route rather than throw', () => {
          const awsRouteTable: RouteTable = {
            RouteTableId: 'rtb-dead-nat',
            VpcId: 'vpc-abc123',
            Routes: [
              {
                DestinationCidrBlock: '0.0.0.0/0',
                InstanceId: 'i-0deadnat00000000',
                Origin: 'CreateRoute',
                State: 'active',
              },
            ],
            Associations: [],
            Tags: [{ Key: 'exid', Value: 'dead-nat-route-table' }],
          };
          const result = castIntoDeclaredAwsVpcRouteTable(awsRouteTable, {
            vpc: 'test-vpc-exid',
            gateways: {},
            subnets: {},
            instances: {}, // the terminated nat resolves to no exid
          });
          expect(result.routes).toEqual([]);
        });
      });
    },
  );

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
          instances: {},
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
          instances: {},
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
          instances: {},
        });
        expect(result.associations).toEqual([]);
      });
    });
  });
});
