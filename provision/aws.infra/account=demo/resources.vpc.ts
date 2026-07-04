import type { DomainEntity } from 'domain-objects';

import {
  DeclaredAwsVpc,
  DeclaredAwsVpcInternetGateway,
  DeclaredAwsVpcRouteTable,
  DeclaredAwsVpcSecurityGroup,
  DeclaredAwsVpcSubnet,
} from '../../../src/contract/sdks';

/**
 * .what = VPC infrastructure for the demo account, in the fck-nat pattern
 * .why = dogfood the real SSH-over-SSM usecase: a private box reaches the
 *        internet (SSM endpoints) through a NAT instance, with no public IP and
 *        no inbound SSH exposure
 * .note
 *   - public subnet hosts the NAT instance (declared in resources.ec2.ts)
 *   - private subnet hosts the SSH box; its 0.0.0.0/0 route targets the NAT
 */
export const getResourcesOfVpc = (): DomainEntity<any>[] => {
  // demo VPC
  const vpc = DeclaredAwsVpc.as({
    exid: 'declastruct-demo-vpc',
    cidr: { v4: '10.0.0.0/16' },
    dns: { hostnames: 'enabled', support: 'enabled' },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // public subnet — hosts the NAT instance (needs a public IP + IGW route)
  const subnetPublic = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-demo-subnet-public-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.1.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // private subnet — hosts the SSH box (no public IP; egress via NAT)
  const subnetPrivate = DeclaredAwsVpcSubnet.as({
    exid: 'declastruct-demo-subnet-private-1a',
    vpc: { exid: vpc.exid },
    cidr: { v4: '10.0.2.0/24' },
    zone: { availability: 'us-east-1a' },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // shared security group
  // note
  //   - ingress allows VPC-internal traffic so the NAT can forward return
  //     packets for the private subnet
  //   - there is NO 0.0.0.0/0 ingress on port 22; SSH arrives over the SSM
  //     tunnel (loopback on the box), so the box is never exposed to the internet
  const securityGroup = DeclaredAwsVpcSecurityGroup.as({
    exid: 'declastruct-demo-sg',
    vpc: { exid: vpc.exid },
    name: 'declastruct-demo-sg',
    description: 'security group for declastruct demo instances',
    rules: {
      ingress: [
        {
          protocol: 'all',
          port: { from: 0, upto: 0 },
          cidrs: [{ v4: '10.0.0.0/16' }],
          description:
            'allow all inbound from within vpc - required so the NAT can forward egress traffic from the private subnet',
        },
      ],
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

  // internet gateway (egress for the public subnet / NAT)
  const internetGateway = DeclaredAwsVpcInternetGateway.as({
    exid: 'declastruct-demo-igw',
    vpc: { exid: vpc.exid },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // public route table — 0.0.0.0/0 to the internet gateway
  const routeTablePublic = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-demo-rtb-public',
    vpc: { exid: vpc.exid },
    routes: [
      {
        destination: { cidr: { v4: '0.0.0.0/0' } },
        target: { gatewayInternet: { exid: internetGateway.exid } },
      },
    ],
    associations: [{ subnet: { exid: subnetPublic.exid } }],
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // note
  //   - the private route table (0.0.0.0/0 -> NAT instance) lives in
  //     resources.ec2.nat.ts, since it must be applied after the NAT exists

  return [
    vpc,
    subnetPublic,
    subnetPrivate,
    securityGroup,
    internetGateway,
    routeTablePublic,
  ];
};
