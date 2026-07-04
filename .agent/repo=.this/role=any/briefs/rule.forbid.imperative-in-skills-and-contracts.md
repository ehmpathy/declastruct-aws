# rule.forbid.imperative-in-skills-and-contracts

## .what

skills and public contracts must NOT drive resources imperatively. forbidden:

1. raw provider sdk/cli resource calls — `aws ec2 ...`, `aws ssm ...`, a bare
   `new EC2Client().send(...)`, etc.
2. direct imperative domain-op calls to mutate remote state — `setEc2InstanceSession`,
   `setEc2SshKeyAuthorized`, `setSsmSshTunnel`, and peers — called straight from a
   skill/contract instead of through a declared wish + `declastruct apply`.

## .why

imperative resource drive in a skill or public contract is a double failure:

- it does NOT dogfood the declarative product we ship, so the plan/apply path stays
  unexercised where it matters most — the shop window
- it silently reinvents idempotency, apply-order, drift detection, readiness
  retries, and cleanup — each a bug farm (see the imperative NAT scaffold incident
  in `rule.require.declarative-test-infra`)

a raw sdk call wrapped in a TypeScript "bridge" is NOT laundered. a direct
`setX` call is imperative even though `setX` is a domain op — the skill still
issues a command instead of a declared state. the only declarative move is to
declare `DeclaredAwsX` and `declastruct apply` it.

## .the tell

ask: "does this line COMMAND a change, or DECLARE a desired end state?"

- commands a change -> imperative -> forbidden here
- declares end state (a `DeclaredAwsX` handed to apply) -> allowed

## .examples

### 👎 forbidden — raw cli in a skill

```bash
aws ec2 start-instances --instance-ids "$IID"
aws ssm send-command --instance-ids "$IID" --document-name AWS-RunShellScript ...
```

### 👎 forbidden — direct set* bridge (imperative in disguise)

```ts
await setEc2InstanceSession({ session: { instance, status: 'active' } }, context);
await setEc2SshKeyAuthorized({ instance, publicKey, comment }, context);
```

### 👍 allowed — declare + apply

```ts
export const getResources = async () => [
  DeclaredAwsEc2InstanceSession.as({ instance, status: 'active' }),
  DeclaredAwsEc2SshKeyAuthorized.as({ instance, publicKey, comment }),
];
```
```bash
npx declastruct apply --plan yolo --wish "$HERE/use.ssh.tunnel.ts"
```

## .where

- skills: `.agent/**/skills/**`
- public contracts: `src/contract/**`

## .exemptions

- **read-only diagnostics**: a skill may issue read-only `get*` / `describe*` /
  list calls for observation (e.g. `aws.ec2.list`, `aws.ssm.sessions`) — these
  observe, they do not drive desired state.
- **local-machine config** that belongs to a separate tool's domain (e.g. an edit
  to `~/.ssh/config`) — the local-config boundary, not cloud resources.
- **cleanup/teardown** that has no declarative expression yet (e.g. terminate an
  orphaned test instance) — but a declarable teardown must be declared, not hand-rolled.

## .enforcement

- raw sdk/cli resource mutation in a skill or public contract = blocker
- direct `setX` remote-state mutation from a skill or public contract = blocker
- observation-only reads and local-config ops = allowed

## .see also

- `rule.require.declarative-in-skills-and-contracts` — the require counterpart
- `rule.require.declarative-test-infra` — the same discipline for test setup
- `rule.require.dao-and-acceptance-per-declared-resource` — DAOs make declare+apply drivable
