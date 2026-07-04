import { type DomainEntity, RefByUnique } from 'domain-objects';

import {
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2LaunchTemplate,
  type DeclaredAwsIamInstanceProfile,
  DeclaredAwsVpcRouteTable,
} from '../../../src/contract/sdks';

/**
 * .what = Amazon Linux 2023 AMI (x86_64, us-east-1)
 * .why = ships the SSM agent + AWS CLI and the tools the NAT user data needs
 */
const AL2023_AMI_US_EAST_1 = 'ami-0453ec754f44f9a4a';

/**
 * .what = user data that turns a plain instance into a NAT (fck-nat style)
 * .why = enables IP forward + iptables masquerade so the private box can egress
 * .note
 *   - detects the primary interface dynamically (AL2023/Nitro names it ens5)
 *   - source/dest check is disabled declaratively on the instance, not here
 */
const NAT_USER_DATA = `#!/bin/bash
set -e

# detect the primary network interface (the one with the default route)
PRIMARY_IFACE=$(ip -o -4 route show to default | awk '{print $5}' | head -n1)

# enable IP forward (persists across reboots via sysctl.conf)
echo 1 > /proc/sys/net/ipv4/ip_forward
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf

# configure iptables NAT (masquerade); iptables-services restores it on each boot
yum install -y iptables-services
systemctl enable iptables
iptables -t nat -A POSTROUTING -o "$PRIMARY_IFACE" -j MASQUERADE
iptables -A FORWARD -i "$PRIMARY_IFACE" -o "$PRIMARY_IFACE" -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i "$PRIMARY_IFACE" -o "$PRIMARY_IFACE" -j ACCEPT
service iptables save
`;

/**
 * .what = the NAT instance that fronts the demo private subnet, plus the private
 *         route table that wires the private subnet's egress through it
 * .why = gives the private box egress to the internet (SSM endpoints, EC2 API)
 *        without a public IP on the box itself
 * .note
 *   - the route table targets the NAT by exid, so it must be applied after the
 *     NAT instance exists; declared together here to keep that order correct
 */
export const getResourcesOfEc2Nat = (): DomainEntity<any>[] => {
  // NAT launch template (masquerade via user data; reuses the SSM profile)
  const natLaunchTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'declastruct-demo-nat-template',
    instanceType: 't3.micro', // free-tier eligible
    imageId: AL2023_AMI_US_EAST_1,
    hibernation: false,
    rootVolumeSize: 8,
    rootVolumeEncrypted: false,
    iamInstanceProfile: RefByUnique.as<typeof DeclaredAwsIamInstanceProfile>({
      name: 'declastruct-demo-ec2-profile',
    }),
    userData: NAT_USER_DATA,
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // NAT instance in the public subnet (egress for the private box)
  // note: publicIpEnabled -> reachable internet; sourceDestChecked:false -> can forward
  const natInstance = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-demo-nat',
    template:
      RefByUnique.as<typeof DeclaredAwsEc2LaunchTemplate>(natLaunchTemplate),
    network: {
      subnet: { exid: 'declastruct-demo-subnet-public-1a' },
      security: { groups: [{ exid: 'declastruct-demo-sg' }] },
      interface: { publicIpEnabled: true, sourceDestChecked: false },
    },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // NAT session — active (a NAT must run to forward traffic)
  const natInstanceSession = DeclaredAwsEc2InstanceSession.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(natInstance),
    status: 'active',
  });

  // private route table — 0.0.0.0/0 through the NAT instance declared above
  // note: targets the NAT by exid, so it follows the NAT instance in apply order
  const routeTablePrivate = DeclaredAwsVpcRouteTable.as({
    exid: 'declastruct-demo-rtb-private',
    vpc: { exid: 'declastruct-demo-vpc' },
    routes: [
      {
        destination: { cidr: { v4: '0.0.0.0/0' } },
        target: {
          instanceNat: {
            instance:
              RefByUnique.as<typeof DeclaredAwsEc2Instance>(natInstance),
          },
        },
      },
    ],
    associations: [{ subnet: { exid: 'declastruct-demo-subnet-private-1a' } }],
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  return [
    natLaunchTemplate,
    natInstance,
    natInstanceSession,
    routeTablePrivate,
  ];
};
