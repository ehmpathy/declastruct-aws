import { type DomainEntity, RefByUnique } from 'domain-objects';

import {
  DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2LaunchTemplate,
  type DeclaredAwsIamInstanceProfile,
} from '../../../src/contract/sdks';

/**
 * .what = Amazon Linux 2023 AMI (x86_64, us-east-1)
 * .why = ships the SSM agent + AWS CLI; supports hibernation
 */
const AL2023_AMI_US_EAST_1 = 'ami-0453ec754f44f9a4a';

/**
 * .what = user data that makes the box hibernate itself after 90 min of idle
 * .why = the vision's headline — auto-hibernate when no one uses the box, so it
 *        costs only EBS storage while idle and resumes with state intact
 * .note
 *   - idle = no logged-in sessions; a login refreshes the idle clock
 *   - the box calls StopInstances --hibernate on itself (egress via the NAT);
 *     the IAM role grants this, scoped to declastruct-managed instances
 *   - a 5-minute systemd timer drives the check
 */
const HIBERNATOR_USER_DATA = `#!/bin/bash
set -e

# install the idle-hibernate check procedure
cat > /usr/local/bin/idle-hibernate.sh <<'IDLECHECK'
#!/bin/bash
# hibernate this box once it has had no logins for 90 minutes
IDLE_LIMIT=5400
STATE=/var/lib/idle-hibernate/last-active
mkdir -p /var/lib/idle-hibernate
[ -f "$STATE" ] || date +%s > "$STATE"

# a present login refreshes the idle clock
if who | grep -q .; then
  date +%s > "$STATE"
  exit 0
fi

# no logins: hibernate once the idle limit elapses
LAST=$(cat "$STATE")
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
Description=hibernate this box after idle

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
 * .what = the SSH-able box that hibernates itself when idle
 * .why = dogfood the real usecase — SSH into a private box over SSM, with the box
 *        auto-hibernate when idle and resume on demand with state intact
 * .note = placed in the private subnet; reached only over the SSM tunnel
 */
export const getResourcesOfEc2Hibernator = (): DomainEntity<any>[] => {
  // box launch template — hibernation enabled + idle-hibernate user data
  const boxLaunchTemplate = DeclaredAwsEc2LaunchTemplate.as({
    exid: 'declastruct-demo-box-template',
    instanceType: 't3.micro', // free-tier eligible; 1 GiB RAM
    imageId: AL2023_AMI_US_EAST_1,
    hibernation: true,
    rootVolumeSize: 16, // must hold RAM for hibernation
    rootVolumeEncrypted: true, // required for hibernation
    iamInstanceProfile: RefByUnique.as<typeof DeclaredAwsIamInstanceProfile>({
      name: 'declastruct-demo-ec2-profile',
    }),
    userData: HIBERNATOR_USER_DATA,
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // the SSH box in the private subnet (no public IP; reached over SSM)
  const box = DeclaredAwsEc2Instance.as({
    exid: 'declastruct-demo-box',
    template:
      RefByUnique.as<typeof DeclaredAwsEc2LaunchTemplate>(boxLaunchTemplate),
    network: {
      subnet: { exid: 'declastruct-demo-subnet-private-1a' },
      security: { groups: [{ exid: 'declastruct-demo-sg' }] },
      interface: { publicIpEnabled: false, sourceDestChecked: true },
    },
    tags: { managedBy: 'declastruct', purpose: 'demo' },
  });

  // box session — active on apply; the box hibernates itself once idle
  const boxSession = DeclaredAwsEc2InstanceSession.as({
    instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>(box),
    status: 'active',
  });

  return [boxLaunchTemplate, box, boxSession];
};
