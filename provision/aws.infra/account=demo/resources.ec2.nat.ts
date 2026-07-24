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
 * .what = user data that turns a plain instance into a NAT (fck-nat style) AND makes it
 *         self-hibernate after 90 min of no forwarded traffic — the same idle-hibernate
 *         discipline the demo box has, so the NAT costs only EBS storage while idle
 * .why = a NAT that runs 24/7 is the whole demo EC2 bill (~$0.25/day). the box already
 *        hibernates on idle; the NAT should too, so egress costs only EBS while the box is
 *        hibernated and no traffic needs a route out. it resumes on demand (use.ssh.tunnel
 *        --nat resumes the NAT before the box, and any apply of its active session boots it)
 * .note
 *   - detects the primary interface dynamically (AL2023/Nitro names it ens5)
 *   - source/dest check is disabled declaratively on the instance, not here
 *   - IDLE SIGNAL: a NAT has NO logins, so its "activity" is the FORWARD chain packet
 *     counter — if no NEW packets crossed in the idle window, no box needs egress. when the
 *     box hibernates, traffic halts, the counter stalls, and the NAT hibernates too
 *   - hibernate preserves RAM (incl. the iptables rules), so masquerade survives a resume
 *   - the IAM role (declastruct-demo-ec2-role) already grants ec2:StopInstances scoped to
 *     managedBy=declastruct, which this NAT carries — so no IAM change is needed
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

# install the idle-hibernate check procedure (keyed on forwarded traffic, not logins)
cat > /usr/local/bin/idle-hibernate.sh <<'IDLECHECK'
#!/bin/bash
# hibernate this NAT once it has forwarded no new packets for 90 minutes
IDLE_LIMIT=5400
STATE_DIR=/var/lib/idle-hibernate
STATE_TS=$STATE_DIR/last-active
STATE_PKTS=$STATE_DIR/last-forward-pkts
mkdir -p "$STATE_DIR"

# the odometer: total packets the FORWARD chain has passed since boot/resume
PKTS_NOW=$(iptables -w -t filter -vxn -L FORWARD | awk 'NR>2 {sum += $1} END {print sum+0}')
[ -f "$STATE_PKTS" ] || echo 0 > "$STATE_PKTS"
[ -f "$STATE_TS" ] || date +%s > "$STATE_TS"
PKTS_LAST=$(cat "$STATE_PKTS")

# new traffic since the last check refreshes the idle clock
if [ "$PKTS_NOW" != "$PKTS_LAST" ]; then
  date +%s > "$STATE_TS"
fi
echo "$PKTS_NOW" > "$STATE_PKTS"

# no new traffic for the idle window: hibernate self
LAST=$(cat "$STATE_TS")
NOW=$(date +%s)
if [ $((NOW - LAST)) -ge $IDLE_LIMIT ]; then
  TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
  IID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
  REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
  aws ec2 stop-instances --hibernate --instance-ids "$IID" --region "$REGION"
fi
IDLECHECK
chmod +x /usr/local/bin/idle-hibernate.sh

# seed the idle clock now
mkdir -p /var/lib/idle-hibernate
date +%s > /var/lib/idle-hibernate/last-active

# reset the idle clock on each boot so a fresh start grants a full window
cat > /etc/systemd/system/idle-hibernate-reset.service <<'UNIT'
[Unit]
Description=reset the idle clock on boot

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'mkdir -p /var/lib/idle-hibernate && date +%s > /var/lib/idle-hibernate/last-active'

[Install]
WantedBy=multi-user.target
UNIT

# the idle check itself
cat > /etc/systemd/system/idle-hibernate.service <<'UNIT'
[Unit]
Description=hibernate this NAT after idle

[Service]
Type=oneshot
ExecStart=/usr/local/bin/idle-hibernate.sh
UNIT

# drive the check every 5 minutes
cat > /etc/systemd/system/idle-hibernate.timer <<'UNIT'
[Unit]
Description=check idle every 5 minutes

[Timer]
OnBootSec=300
OnUnitActiveSec=300

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable idle-hibernate-reset.service
systemctl enable --now idle-hibernate.timer
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
    hibernation: true, // self-hibernate on idle, like the box
    rootVolumeSize: 16, // must hold RAM for hibernation
    rootVolumeEncrypted: true, // required for hibernation
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
