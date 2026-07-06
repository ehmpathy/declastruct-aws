#!/bin/bash
//bin/true && exec npx declastruct apply --plan yolo --wish "$0"
//
// ^ self-exec polyglot: as bash this line execs `declastruct apply` on THIS file;
//   as typescript it is a comment. mirrors use.vpc.tunnel.ts in declapract-typescript-ehmpathy.
//
/**
 * .what = ONE declastruct WISH for ssh access to a declastruct EC2 box. it DECLARES
 *   the desired state of the box's aws-side ssh resources and lets `declastruct apply`
 *   drive plan/apply through the DAOs — exactly like use.vpc.tunnel.ts.
 *
 * .declares (in apply order):
 *   0. DeclaredAwsEc2InstanceSession  status=active   — resume the NAT (only if SSH_NAT_EXID set)
 *   1. DeclaredAwsEc2InstanceSession  status=active   — resume the box
 *   2. DeclaredAwsEc2SshKeyAuthorized                 — durably authorize your key
 *   3. DeclaredAwsSsmSshTunnel         status=OPEN     — open a local->:22 ssm tunnel
 *
 * .why = the skill must DECLARE final state, never imperatively call set* ops or raw
 *   aws cli. one apply converges: re-run is a cheap KEEP, drift is detected, apply
 *   order is the declared array order.
 *
 * .why NAT first = a private box (no public ip) reaches the SSM endpoints only via
 *   its NAT's egress route. the NAT auto-hibernates when idle, so its SSM agent stays
 *   TargetNotConnected until the NAT is active. a resume of the NAT first restores the
 *   box's egress so the tunnel's StartSession can connect.
 *
 * .config (env, set by use.ssh.tunnel.sh — all optional but the box):
 *   SSH_BOX_EXID    the instance exid tag (required)
 *   SSH_NAT_EXID    the NAT instance exid to resume first (optional; skip for public boxes)
 *   SSH_ENV         keyrack env for in-process creds (default prep)
 *   SSH_LOCAL_PORT  local port the tunnel binds (default 2222)
 *   SSH_USER        login user the key is authorized for (default ec2-user)
 *   the key         = the machine's default key (~/.ssh/id_ed25519.pub, then id_rsa.pub)
 *   the comment     = declastruct-<exid> (stable -> idempotent authorization)
 *
 * .note = the LOCAL half (key mint + ~/.ssh/config host block) is NOT yet declared
 *   here — it needs declastruct-unix resources. see the handoff:
 *   .agent/repo=.this/role=any/briefs/handoff.declastruct-unix.make-ssh-fully-declarative.md
 */
import type { DeclastructProvider } from 'declastruct';
import { RefByUnique } from 'domain-objects';
import { BadRequestError } from 'helpful-errors';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { keyrack } from 'rhachet/keyrack';
import { genLogMethods } from 'sdk-logs';

import {
  type DeclaredAwsEc2Instance,
  DeclaredAwsEc2InstanceSession,
  DeclaredAwsEc2SshKeyAuthorized,
  DeclaredAwsSsmSshTunnel,
  getDeclastructAwsProvider,
} from '@src/contract/sdks';

// source aws credentials from keyrack IN-PROCESS. this is required: `declastruct
// apply` spawns a fresh process that does NOT inherit the shell's creds, so a
// stale shell SSO token here would fail with `Token is expired`. every declastruct
// wish sources its own creds this way (see howto.provision-keyrack-source.md).
keyrack.source({
  env: process.env.SSH_ENV || 'prep',
  owner: 'ehmpath',
  mode: 'lenient',
});

/**
 * .what = the default local port the tunnel binds; overridable via SSH_LOCAL_PORT.
 *   the box side is always ssh's :22
 */
const LOCAL_PORT_DEFAULT = 2222;

/**
 * .what = the default login user the key is authorized for; overridable via SSH_USER
 */
const LOGIN_USER_DEFAULT = 'ec2-user';

/**
 * .what = read the machine's default ssh public key line
 * .why = the box gets whatever key you already ssh with — no --key knob needed
 */
const getDefaultPublicKey = (): string => {
  const candidates = [
    join(homedir(), '.ssh', 'id_ed25519.pub'),
    join(homedir(), '.ssh', 'id_rsa.pub'),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    return BadRequestError.throw(
      'no default ssh key at ~/.ssh/id_ed25519.pub or ~/.ssh/id_rsa.pub',
      { hint: 'generate one: ssh-keygen -t ed25519' },
    );
  return readFileSync(found, 'utf-8').trim();
};

/**
 * .what = level-gated log methods; defaults to INFO locally so the DAOs' debug
 *   .progress/.output trail stays quiet. re-run with LOG_LEVEL=debug to see it.
 */
const log = genLogMethods();

/**
 * .what = the aws provider that carries the DAOs + credential context
 * .note = a second provider (declastruct-unix-network) belongs here once the local
 *   key + ssh-config resources exist — see the handoff brief referenced above
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  await getDeclastructAwsProvider({}, { log }),
];

/**
 * .what = the desired resource state — always all three, in apply order
 */
export const getResources = async (): Promise<
  Array<
    | InstanceType<typeof DeclaredAwsEc2InstanceSession>
    | InstanceType<typeof DeclaredAwsEc2SshKeyAuthorized>
    | InstanceType<typeof DeclaredAwsSsmSshTunnel>
  >
> => {
  const exid =
    process.env.SSH_BOX_EXID ||
    BadRequestError.throw('SSH_BOX_EXID is required');

  const instance = RefByUnique.as<typeof DeclaredAwsEc2Instance>({ exid });
  const publicKey = getDefaultPublicKey();
  const comment = `declastruct-${exid}`;
  const user = process.env.SSH_USER || LOGIN_USER_DEFAULT;
  const localPort = process.env.SSH_LOCAL_PORT
    ? Number.parseInt(process.env.SSH_LOCAL_PORT, 10)
    : LOCAL_PORT_DEFAULT;

  // 0. resume the NAT first (if any) so the private box has egress to the SSM
  //    endpoints before its agent must connect for the key append + tunnel
  const natExid = process.env.SSH_NAT_EXID || null;
  const natSession = natExid
    ? DeclaredAwsEc2InstanceSession.as({
        instance: RefByUnique.as<typeof DeclaredAwsEc2Instance>({
          exid: natExid,
        }),
        status: 'active',
      })
    : null;

  // 1. the box must be active before the key append + tunnel open
  const session = DeclaredAwsEc2InstanceSession.as({
    instance,
    status: 'active',
  });

  // 2. durably authorize the machine's default key on the box (survives stop/start)
  const key = DeclaredAwsEc2SshKeyAuthorized.as({
    instance,
    publicKey,
    comment,
    user,
  });

  // 3. open the tunnel: local port -> the box's port 22, over ssm
  const tunnel = DeclaredAwsSsmSshTunnel.as({
    instance,
    from: { port: localPort },
    into: { port: 22 },
    status: 'OPEN',
  });

  // array order = apply order: NAT (if any), active box, then key, then tunnel
  return [...(natSession ? [natSession] : []), session, key, tunnel];
};
