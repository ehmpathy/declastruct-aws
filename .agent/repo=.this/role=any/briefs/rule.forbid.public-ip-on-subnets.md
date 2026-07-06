# rule.forbid.public-ip-on-subnets

## .what

forbid `mapPublicIpOnLaunch: true` on subnets. use fck-nat gateway instead.

## .why

public IPs on EC2 instances are a security risk:
- exposes instance directly to internet
- increases attack surface
- requires additional security group rules
- violates principle of least exposure

## .instead

use a fck-nat gateway:
- ec2 in private subnet (no public IP)
- fck-nat provides egress-only internet access
- fck-nat auto-shuts down when idle (cost savings)
- SSM agent can reach AWS endpoints via NAT

## .architecture

```
┌─────────────────────────────────────────────────────────┐
│                          VPC                            │
│  ┌──────────────────┐    ┌──────────────────────────┐  │
│  │  public subnet   │    │      private subnet      │  │
│  │                  │    │                          │  │
│  │  ┌────────────┐  │    │   ┌─────────────────┐   │  │
│  │  │  fck-nat   │  │    │   │  EC2 instance   │   │  │
│  │  │  gateway   │  │    │   │  (no public IP) │   │  │
│  │  └─────┬──────┘  │    │   └────────┬────────┘   │  │
│  │        │         │    │            │            │  │
│  └────────┼─────────┘    └────────────┼────────────┘  │
│           │                           │                │
│           ▼                           │                │
│    internet gateway ◄─────────────────┘                │
│                       (via NAT route)                  │
└─────────────────────────────────────────────────────────┘
```

## .benefits

| feature | public IP | fck-nat |
|---------|-----------|---------|
| internet egress | yes | yes |
| internet ingress | yes (risk!) | no |
| cost when idle | instance hours | auto-shutdown |
| attack surface | large | minimal |
| SSM connectivity | yes | yes |

## .implementation

1. create public subnet for fck-nat
2. create private subnet for EC2 instances
3. deploy fck-nat instance in public subnet
4. route table for private subnet points 0.0.0.0/0 to fck-nat
5. EC2 instances in private subnet have egress via fck-nat

## .fck-nat

fck-nat is an open source NAT gateway implementation:
- https://github.com/AndrewGuenther/fck-nat
- uses spot instances for cost savings
- auto-hibernates/stops when idle
- ~10x cheaper than AWS NAT Gateway

## .enforcement

- `mapPublicIpOnLaunch: true` on any subnet = blocker
- EC2 with public IP = blocker (except fck-nat itself)

## .see also

- https://fck-nat.dev/
- rule.require.ec2-freetier-instances.md
