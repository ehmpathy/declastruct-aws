import type { DomainEntity } from 'domain-objects';

import {
  DeclaredAwsVpc,
  DeclaredAwsVpcInternetGateway,
  DeclaredAwsVpcRouteTable,
  DeclaredAwsVpcSecurityGroup,
  DeclaredAwsVpcSubnet,
} from '../../../src/contract/sdks';

/**
 * .what = VPC infrastructure for demo account
 * .why = dogfood VPC resources to verify OIDC role has VPC permissions
 */
export const getResourcesOfVpc = (): DomainEntity<any>[] => {
  // demo VPC
  const vpc = DeclaredAwsVpc.as({
    exid: 'declastruct-demo-vpc',
    cidr: { v4: '10.0.0.0/16' },
    dns: { hostnames: 'enabled', support: 'enabled' },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // demo subnet in us-east-1a
  const subnet = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-demo-subnet-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.1.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // demo security group (outbound only)
  const securityGroup = DeclaredAwsVpcSecurityGroup.as({
    exid: 'declastruct-demo-sg',
    vpc: { exid: vpc.exid },
    name: 'declastruct-demo-sg',
    description: 'security group for declastruct demo instances',
    rules: {
      ingress: [],
      egress: [
        {
          protocol: 'all',
          port: { from: 0, upto: 0 },
          cidrs: [{ v4: '0.0.0.0/0' }],
          description: 'allow all outbound',
        },
      ],
    },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // demo internet gateway (for public subnet)
  const internetGateway = DeclaredAwsVpcInternetGateway.as({
    exid: 'declastruct-demo-igw',
    vpc: { exid: vpc.exid },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // demo route table with internet gateway route
  const routeTable = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-demo-rt',
    vpc: { exid: vpc.exid },
    routes: [
      {
        destination: { cidr: { v4: '0.0.0.0/0' } },
        target: { gatewayInternet: { exid: internetGateway.exid } },
      },
    ],
    associations: [{ subnet: { exid: subnet.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  return [vpc, subnet, securityGroup, internetGateway, routeTable];
};
