# rule.require.declarative-in-skills-and-contracts

## .what

skills and public contracts must express intent by DECLARING the desired state of
resources and applying it via declastruct plan/apply, NOT by issuing imperative
resource operations (raw sdk/cli calls, or direct `setX` / `getX` domain-op calls).

they declare a `DeclaredAwsX` (or a set) and hand it to `declastruct apply` — the
DAOs drive get/set/idempotency underneath.

## .why

this repo IS a declarative provision tool. every skill and public contract is a
shop window: whatever pattern it demonstrates is the pattern users copy.

- a declared wish converges: re-apply is a cheap KEEP, drift is detected, order is
  the declared array order, idempotency + cleanup come for free
- an imperative procedure reinvents all of that, badly, and dodges the very product
  we ship — so it never dogfoods the path a user takes
- declaring state is legible: the reader sees WHAT is wanted, not a procedure they
  must simulate to infer the end state

a real incident: the ssh demo skills were first written to call the imperative
domain ops (`setEc2InstanceSession`, `setEc2SshKeyAuthorized`) through a node
bridge. that is still imperative — just in TypeScript instead of bash. the fix was
to collapse them into ONE declastruct WISH (`use.ssh.tunnel.ts`, a self-exec
polyglot with `getProviders`/`getResources`) that DECLARES the box's desired
session + ssh-key + tunnel state and runs `npx declastruct apply --plan yolo
--wish`, exactly like `use.vpc.tunnel` in declapract-typescript-ehmpathy.

## .the shape

### 👍 declarative — a wish, applied

```ts
// use.ssh.tunnel.ts — ONE declastruct wish (self-exec polyglot, like use.vpc.tunnel.ts)
export const getProviders = async () => [await getDeclastructAwsProvider({}, { log: console })];
export const getResources = async () => [
  DeclaredAwsEc2InstanceSession.as({ instance, status: 'active' }),
  DeclaredAwsEc2SshKeyAuthorized.as({ instance, publicKey, comment }),
  DeclaredAwsSsmSshTunnel.as({ instance, from: { port }, into: { port: 22 }, status: 'OPEN' }),
];
```
```bash
# the thin wrapper sources creds + names the box; the wish derives the rest
SSH_BOX_EXID="$BOX" \
  npx declastruct apply --plan yolo --wish "$HERE/use.ssh.tunnel.ts"
```

### 👎 imperative — raw calls, or direct set*

```bash
# raw aws cli — reinvents idempotency, ordering, readiness, cleanup
aws ec2 start-instances --instance-ids "$IID"
aws ssm send-command --instance-ids "$IID" --document-name AWS-RunShellScript ...
```
```ts
// a bridge that calls set* directly — still imperative, just in TypeScript
await setEc2InstanceSession({ session: { instance, status: 'active' } }, context);
await setEc2SshKeyAuthorized({ instance, publicKey, comment }, context);
```

## .where

- skills: `.agent/**/skills/**`
- public contracts: `src/contract/**`

## .the boundary — unix/local concerns are exempt

declaring cloud/remote resource state is the rule. operations that touch the LOCAL
machine's own config are exempt when they belong to a different tool's domain — e.g.
editing `~/.ssh/config` (a unix-network concern for a separate repo). the exemption
is for the local-config boundary, not a license to go imperative on cloud resources.

## .enforcement

- a skill or public contract that issues raw sdk/cli resource calls = blocker
- a skill or public contract that calls `setX`/`getX` domain ops directly instead
  of declaring + applying = blocker
- exempt: local-machine config ops that belong to a separate tool's domain

## .see also

- `rule.forbid.imperative-in-skills-and-contracts` — the forbid counterpart
- `rule.require.dao-and-acceptance-per-declared-resource` — every declared resource
  needs a DAO (the thing that makes plan/apply drivable) + acceptance coverage
- `rule.require.declarative-test-infra` — declare test infra the same way a user would
- `rule.prefer.declastruct.[demo]` (ehmpathy/mechanic) — the get/set/cast pattern a DAO wraps
