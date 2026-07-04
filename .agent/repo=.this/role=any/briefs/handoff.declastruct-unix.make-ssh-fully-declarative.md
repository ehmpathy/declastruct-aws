# handoff.declastruct-unix.make-ssh-fully-declarative

## .what

what `declastruct-unix` (a.k.a. declastruct-unix-network) must add so that
`use.ssh.tunnel.ts` can declare the ENTIRE ssh-access flow in ONE wish — the
local-machine half as well as the aws half — with zero imperative bash left.

## .why

today `use.ssh.tunnel.ts` declares only the aws-side resources:

| # | declared resource | provider | status |
|---|-------------------|----------|--------|
| 1 | `DeclaredAwsEc2InstanceSession` (active) | declastruct-aws | ✅ done |
| 2 | `DeclaredAwsEc2SshKeyAuthorized` | declastruct-aws | ✅ done |
| 3 | `DeclaredAwsSsmSshTunnel` (OPEN) | declastruct-aws | ✅ done |

the LOCAL half is still imperative — it lives in the `use.ssh.tunnel.sh` wrapper
and in `aws.ssh.config.sh`:

| local concern | today (imperative) | wants to become (declared) |
|---------------|--------------------|-----------------------------|
| mint/pick a local keypair | `ssh-keygen` in the .sh | `DeclaredUnixSshKeypair` |
| `~/.ssh/config` Host block | `aws.ssh.config.sh` writes it | `DeclaredUnixSshConfigHost` |
| (optional) `/etc/hosts` alias | n/a here (see use.vpc.tunnel) | `DeclaredUnixHostAlias` (exists) |

once these three unix resources exist, the wrapper `.sh` collapses to a thin
cred-source, and `use.ssh.tunnel.ts` declares all six resources across two
providers — exactly the shape of `use.vpc.tunnel.ts` (which already declares
`DeclaredAwsVpcTunnel` + `DeclaredUnixHostAlias` across aws + unix providers).

## .the ask — resources declastruct-unix must add

### 1. `DeclaredUnixSshKeypair`

- **.unique** = `[path]` (e.g. `~/.ssh/declastruct-demo`)
- **.fields** = `path`, `type` ('ed25519' | 'rsa'), `comment`
- **.readonly** = `publicKey` (the `.pub` line, resolved after mint)
- **get** = read the key at `path`; return null if absent (never overwrite an
  extant key — findsert, not upsert)
- **set.findsert** = if the key exists, return it; else `ssh-keygen -t <type> -f
  <path> -N '' -C <comment>` and return it
- **.why readonly publicKey** = so a downstream `DeclaredAwsEc2SshKeyAuthorized`
  can reference `keypair.publicKey` without a wrapper that must read `.pub` files

### 2. `DeclaredUnixSshConfigHost`

- **.unique** = `[alias]` (the `Host <alias>` line)
- **.fields** = `alias`, `hostname`, `user`, `identityFile`, `proxyCommand`
  (nullable), `port` (nullable), `via` (default `~/.ssh/config`)
- **get** = parse the `Host <alias>` block out of the config file; null if absent
- **set.upsert** = findsert-then-replace the block in place (idempotent; never
  duplicate a Host block) — same discipline as the extant `DeclaredUnixHostAlias`
  for `/etc/hosts`
- **.note** = the ProxyCommand form
  `aws ssm start-session --target %h --document-name AWS-StartSSHSession
  --parameters portNumber=%p` is what `aws.ssh.config.sh` writes today; that whole
  procedure becomes the declared `proxyCommand` field

### 3. `getDeclastructUnixNetworkProvider` must register both DAOs

so `use.ssh.tunnel.ts` can add the provider to `getProviders()` and the resources
to `getResources()`.

## .the end state — one wish, both providers

```ts
// use.ssh.tunnel.ts (target)
export const getProviders = async () => [
  await getDeclastructAwsProvider({}, { log: console }),
  await getDeclastructUnixNetworkProvider({}, { log: console }), // NEW
];

export const getResources = async () => {
  const keypair = DeclaredUnixSshKeypair.as({ path, type: 'ed25519', comment }); // NEW
  const instance = RefByUnique.as<typeof DeclaredAwsEc2Instance>({ exid });
  return [
    keypair,                                                                     // NEW: mint local key
    DeclaredAwsEc2InstanceSession.as({ instance, status: 'active' }),
    DeclaredAwsEc2SshKeyAuthorized.as({ instance, publicKey: keypair.publicKey, comment }),
    DeclaredAwsSsmSshTunnel.as({ instance, from: { port }, into: { port: 22 }, status: 'OPEN' }),
    DeclaredUnixSshConfigHost.as({                                               // NEW: ssh config
      alias, hostname: 'localhost', port, user: 'ec2-user', identityFile: `${path}`,
      proxyCommand: null, // direct tunnel already binds localhost:port
    }),
  ];
};
```

then the `.sh` wrapper drops key mint + `aws.ssh.config.sh` entirely, and the whole
flow is: source creds -> `declastruct apply --wish use.ssh.tunnel.ts`.

## .apply-order note

declastruct applies in DECLARED ARRAY ORDER (no topological sort). so the array
must read: keypair (mint local) -> session (resume box) -> key authorized (needs
both) -> tunnel (needs box) -> ssh config (local, last). keep that order.

## .until then

`use.ssh.tunnel.sh` stays as the thin wrapper that mints/picks the key and sources
creds; `aws.ssh.config.sh` stays as the imperative `~/.ssh/config` writer. both are
the LOCAL-config boundary that `rule.forbid.imperative-in-skills-and-contracts`
explicitly exempts — until this handoff lands and they become declared.

## .see also

- `use.vpc.tunnel.ts` / `use.vpc.tunnel.sh` (declapract-typescript-ehmpathy) — the
  two-provider precedent this mirrors
- `rule.require.declarative-in-skills-and-contracts`
- `rule.forbid.imperative-in-skills-and-contracts`
- `rule.require.dao-and-acceptance-per-declared-resource` — each new
  `DeclaredUnixX` needs a DAO + acceptance coverage too
