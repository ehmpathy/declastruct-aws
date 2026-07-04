# resources.ec2.hibernator

a real, SSH-able EC2 box in the demo account — the dogfood of the
"SSH over SSM + hibernate" usecase.

## what it is

a private box you reach over SSM (no public IP, no inbound SSH), fronted by the
NAT instance for egress, set to hibernate itself when idle.

| trait | value |
|-------|-------|
| exid | `declastruct-demo-box` |
| placement | private subnet, no public IP |
| reach | SSM port-forward tunnel only (port 22 never exposed) |
| login user | `ec2-user` |
| auto-hibernate | hibernates itself after 90 min with no logins |
| resume | `aws ec2 start-instances` restores it with state intact |

it depends on peers declared in the same account:

- `resources.vpc.ts` — public + private subnets, security group, route tables
- `resources.iam.ts` — EC2 role with `AmazonSSMManagedInstanceCore` (so the SSM
  agent registers) + an inline `ec2:StopInstances` permission scoped to
  declastruct-managed instances (so the box can hibernate itself)
- `resources.ec2.nat.ts` — the NAT the private box egresses through

## prereqs

1. demo account exists (provision `aws.auth/account=.root` first)
2. demo OIDC role has the permissions in `demoPermissionsPolicy` — includes
   `ec2-instance-connect:SendSSHPublicKey`, EC2, SSM, and route-table actions
   (provision `aws.auth/account=demo` first)
3. local tools: AWS CLI, the AWS Session Manager plugin, `ssh`, `ssh-keygen`

## apply

apply the whole demo infra (this box is part of `resources.ts`):

```bash
use.ehmpathy.demo
npx declastruct plan \
  --wish provision/aws.infra/account=demo/resources.ts \
  --into provision/aws.infra/account=demo/.temp/plan.json
npx declastruct apply \
  --plan provision/aws.infra/account=demo/.temp/plan.json
```

note: the NAT runs its user data on first boot (yum + iptables, ~60s). give it a
minute after apply before the box has egress.

## ssh into the box — the easy way

three skills wrap the whole flow (they clear ambient creds, auto-unlock keyrack,
prove auth, and wait for the SSM agent before the connect):

```bash
# one-time: authorize your key on the box (durable across hibernate)
rhx aws.ssh.authorize

# one-time: register an ~/.ssh Host alias with an SSM ProxyCommand
rhx aws.ssh.config

# anytime: connect (auto-resumes the box if it hibernated)
rhx aws.ssh.connect

# or, after config, plain ssh works:
ssh declastruct-demo-box

# run one command and exit:
rhx aws.ssh.connect -- 'echo hello from $(hostname)'
```

all three default to `--box declastruct-demo-box --env prep`; each takes
`--box/--alias/--env/--key/--user` to point at any other declastruct box.

## ssh into the box — the manual way

the box has no public IP and no inbound port 22. you reach it in steps: push a
short-lived key via EC2 Instance Connect, open an SSM port-forward tunnel, then
`ssh` to the local end of the tunnel.

```bash
# 0. find the box id
BOX_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:exid,Values=declastruct-demo-box" \
            "Name=instance-state-name,Values=running,stopped" \
  --query "Reservations[0].Instances[0].InstanceId" --output text)

# 1. resume the box if it hibernated (no-op if already active)
aws ec2 start-instances --instance-ids "$BOX_ID"
aws ec2 wait instance-running --instance-ids "$BOX_ID"

# 2. mint a throwaway keypair
ssh-keygen -t ed25519 -f /tmp/demo-key -N '' -C demo

# 3. open the SSM tunnel in the background (local port 2222 -> box port 22)
aws ssm start-session --target "$BOX_ID" \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["22"],"localPortNumber":["2222"]}' &
sleep 10

# 4. authorize the key (valid ~60s) then ssh in within that window
aws ec2-instance-connect send-ssh-public-key \
  --instance-id "$BOX_ID" --instance-os-user ec2-user \
  --ssh-public-key file:///tmp/demo-key.pub
ssh -i /tmp/demo-key -p 2222 \
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  ec2-user@127.0.0.1
```

if the key expires before you connect, re-run step 4.

the same flow is what the integration test
`ssmSshTunnel.journey.integration.test.ts` (case4) proves end-to-end, and what
the domain operations `setEc2SshKeyAuthorized` (Instance Connect) and
`setSsmSshTunnel` (the tunnel) wrap.

## auto-hibernate

the box hibernates itself once it has had no logins for 90 minutes:

- a systemd timer fires every 5 minutes (`idle-hibernate.timer`)
- a present login refreshes the idle clock; the clock also resets on each boot
- when idle, the box calls `aws ec2 stop-instances --hibernate` on itself
  (egress via the NAT; the IAM role grants this, tag-scoped)
- a hibernated box costs only EBS storage; `start-instances` resumes it with
  memory state intact

to hibernate it yourself, or to stop it when done:

```bash
aws ec2 stop-instances --hibernate --instance-ids "$BOX_ID"   # hibernate
aws ec2 stop-instances --instance-ids "$BOX_ID"               # plain stop
```

## cost note

the NAT instance is a persistent t3.micro (it is the gateway). to pause all demo
cost when you are done, stop the NAT too:

```bash
NAT_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:exid,Values=declastruct-demo-nat" \
  --query "Reservations[0].Instances[0].InstanceId" --output text)
aws ec2 stop-instances --instance-ids "$NAT_ID"
```

restart it before the next session: `aws ec2 start-instances --instance-ids "$NAT_ID"`.

## orphan SSM sessions

an SSM port-forward session whose target box is terminated never self-closes.
list and prune them with:

```bash
rhx aws.ssm.sessions                        # list active sessions (marks orphans)
rhx aws.ssm.sessions --prune orphans --mode apply   # terminate orphans
```
