# the grove reach — `resources.reach.ts`

a clone on a collaborator's camp grove box holds one credential: the box's own instance role,
ambient in imds. that badge reaches their org, and has never heard of ehmpathy.

`ehmpathy-demo-for-grove` closes that gap — the box's badge assumes it, so no ehmpathy credential
is hand-carried onto a foreign org's host.

⚠️ **this is ONE HALF of a two-repo reach.** the caller half is an `sts:AssumeRole` statement in
the collaborator's grove role, naming our arn. ours alone applies cleanly and fails at runtime,
invisible to any plan.

## the handoff arn — what they hardcode

```
arn:aws:iam::<demo-account-id>:role/ehmpathy-demo-for-grove
```

resolve `<demo-account-id>` with `aws sts get-caller-identity`.

## the caller identity — what we supply at apply time

their account id and grove role name are **absent from source**: this repo is public and theirs is
not, so a constant here would publish another org's identity. they arrive from the environment:

```sh
cp -n provision/aws.auth/account=demo/.env.example provision/aws.auth/account=demo/.env
# fill both values from the collaborator's private tree
source provision/aws.auth/account=demo/.env
```

| var | what it is |
|---|---|
| `GROVE_REACH_CAMP_ACCOUNT_ID` | the collaborator's aws account id |
| `GROVE_REACH_CAMP_ROLE_NAME` | the grove role our trust policy names as principal |

⚠️ **neither is a secret** — both land in the applied trust policy. this is disclosure control
against a public git history, never secrecy.

⚠️ **the applier's shell decides who may assume this role.** the resolved principal arn shows in
the plan diff, and that read is its only review. an absent var fails loud at plan time.

### no `.env`, and you need one now

this gates **every** apply of `account=demo`, the reach-unrelated ones included — the oidc
CI-repair among them (`howto.reapply-demo-oidc-role`). read the pair off the live role:

```sh
aws iam get-role --role-name ehmpathy-demo-for-grove \
  --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.AWS' --output text
# → arn:aws:iam::<GROVE_REACH_CAMP_ACCOUNT_ID>:role/<GROVE_REACH_CAMP_ROLE_NAME>
```

the admin creds this apply already needs carry that `iam:GetRole`. the absent-var error names this
command too.

⚠️ before the reach's **first** apply the role does not exist, so `get-role` returns `NoSuchEntity`
— ask whoever applied it.

🔴 **do not invent a placeholder.** a made-up pair plans a `CREATE` with a principal that cannot
exist — an applied role that reads live and denies every assume, which is cause 3 below, and cause
3 points at the collaborator's repo.

## you hit `AccessDenied` — start here

four causes emit a byte-identical `AccessDenied`. **step 1, always:**

```sh
aws sts get-caller-identity
```

it discriminates exactly one of the four:

| # | cause | `get-caller-identity` shows | where to go |
|---|---|---|---|
| 1 | **the assume never took effect** — a tool set `AWS_PROFILE`, the sdk skipped your session and fell through to imds | ✅ **caught** — the arn is the box's own **grove role**, not `ehmpathy-demo-for-grove` | the ini profile below |
| 2 | their caller half is absent or unmerged | ⛔ not caught | their grove role's inline policy |
| 3 | our trust policy denies — revoked on purpose | ⛔ not caught | the intent test below, **before** you re-wire |
| 4 | the hardcoded target arn holds a typo | ⛔ not caught; both halves apply cleanly into it | compare their arn to ours, character by character |

**step 2 — tell cause 2 from cause 3.** the fixes are opposite. the discriminator is whether the
stated intent still matches the trust policy:

| the intent here + the role's `description` say | the trust policy says | ⇒ |
|---|---|---|
| the reach is wanted | it denies, or names no live principal | 🔴 **revoked on purpose.** do NOT re-wire |
| the reach is wanted | it names the grove role | **not yet wired.** merge their half |

⇒ the same table drives `.agent/repo=.this/role=any/briefs/howto.revoke-grove-reach.md`.

🟡 the intent is recorded here as well as in the role's `description` because a stranded clone
cannot read the description — that takes `iam:GetRole` in demo, and a clone whose assume just
failed holds no demo credential. this file is on disk.

## on a grove box — two setup steps

**1. an ini profile**, so the sdk refreshes the session:

```ini
[profile ehmpathy-demo]
role_arn = arn:aws:iam::<demo-account-id>:role/ehmpathy-demo-for-grove
credential_source = Ec2InstanceMetadata
region = us-east-1
```

| it closes | how |
|---|---|
| the **1h overrun** | the sdk re-assumes on expiry; static env-var credentials expire mid-flight |
| the **`AWS_PROFILE` trap** | any tool that sets `AWS_PROFILE` makes the sdk skip your exported session and fall through to imds — cause 1 above. with this profile declared, it resolves to the demo role instead |

**2. `export AWS_REGION=us-east-1`.** a grove box carries no `~/.aws/config`, so `getCredentials`
fail-fasts before the first aws call.

## what this role can do

its share of `demoPermissionsPolicy` carries `iam:CreateRole`, `iam:UpdateAssumeRolePolicy`,
`iam:AttachRolePolicy`, `iam:CreateAccessKey`, `ssm:StartSession`, and `ssm:SendCommand` on `'*'`.

⇒ so it can rewrite demo identity and run arbitrary commands on any demo host. that is an accepted
property of a demo account, stated here so nobody rediscovers it as a surprise.

## to revoke

⇒ read `.agent/repo=.this/role=any/briefs/howto.revoke-grove-reach.md` first. deletion is **not** a
revoke, and a single plan runs the two acts in the wrong order.
