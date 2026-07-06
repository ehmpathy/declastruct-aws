#!/usr/bin/env bash
######################################################################
# .what = open an ssh tunnel to a declastruct EC2 box, fully declaratively
#
# .why  = ONE command that DECLARES the box's desired ssh state and applies it:
#         - resumes the box (session active)
#         - durably authorizes your default key (survives stop/start)
#         - opens a localhost:2222 -> box:22 tunnel over SSM
#         it declares state in use.ssh.tunnel.ts and drives it via
#         `declastruct apply` — no imperative set* or raw aws cli. this thin
#         wrapper only sources creds and sets the box the wish reads (mirrors
#         use.vpc.tunnel.sh in declapract-typescript-ehmpathy).
#
# usage:
#   rhx use.ssh.tunnel                              # box=declastruct-demo-box (nat=declastruct-demo-nat)
#   rhx use.ssh.tunnel --box declastruct-demo-box
#   rhx use.ssh.tunnel --box <exid> --env prep --port 2222 --user ec2-user --nat <nat-exid>
#
# options:
#   --box BOX    instance exid tag (default: declastruct-demo-box)
#   --nat NAT    NAT instance exid to resume first, for private boxes (default:
#                declastruct-demo-nat when --box is the demo box, else none)
#   --env ENV    keyrack env for aws creds (default: prep)
#   --port PORT  local port to bind the tunnel (default: 2222)
#   --user USER  login user to authorize the key for (default: ec2-user)
#   --help       show usage
#
# guarantee:
#   - exit 0 = tunnel open (box active + key authorized)
#   - exit 1 = malfunction (aws error, apply failed)
#   - exit 2 = constraint (locked keyrack, box not found)
#
# .note = the key authorized is your machine's default key (~/.ssh/id_ed25519.pub,
#   then id_rsa.pub). ssh in after with: ssh -p <port> <user>@localhost
# .note = a private box (no public ip) reaches SSM only via its NAT's egress route;
#   the NAT auto-hibernates when idle, so it is resumed first. pass --nat for a
#   non-demo private box; pass --nat '' for a public box that needs none.
######################################################################

set -euo pipefail

SKILL="use.ssh.tunnel"
ART="🔌"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"

# failloud: print a clear error tree to stderr and exit with the given code
die() {
  local code="$1"; local msg="$2"; local hint="${3:-}"
  echo "🦫 dam burst..." >&2
  echo "$ART $SKILL" >&2
  echo "   ├─ $msg" >&2
  [[ -n "$hint" ]] && echo "   └─ hint: $hint" >&2
  exit "$code"
}

# unlock the keyrack vault + source the env's aws profile into this shell
ensure_creds() {
  local env="$1"
  # unlock the vault (idempotent); keyrack prints its key tree to stderr on
  # success, so capture both streams and surface them only if the unlock fails
  local out
  out=$(rhx keyrack unlock --owner ehmpath --env "$env" 2>&1) \
    || { echo "$out" >&2; die 2 "keyrack unlock failed for env=$env"; }
  # source our own profile into the shell
  eval "$(rhx keyrack source --key AWS_PROFILE --env "$env" --owner ehmpath --lenient)"
  [[ -n "${AWS_PROFILE:-}" ]] \
    || die 2 "no AWS_PROFILE from keyrack for env=$env" "rhx keyrack unlock --owner ehmpath --env $env"
  export AWS_PROFILE
}

BOX_DEFAULT="declastruct-demo-box"
NAT_DEFAULT="declastruct-demo-nat" # the demo box's NAT; egress for the private box
BOX="$BOX_DEFAULT"
ENV="prep"
PORT="2222"          # local port the tunnel binds; passed to the wish
USER_NAME="ec2-user" # login user the key is authorized for; passed to the wish
NAT=""               # NAT exid to resume first; set below unless user overrides
NAT_SET="false"      # tracks whether --nat was passed explicitly

show_help() {
  echo "🦫 heres the build..."
  echo ""
  echo "🔌 use.ssh.tunnel"
  echo "   usage:"
  echo "     rhx use.ssh.tunnel                    # box=declastruct-demo-box"
  echo "     rhx use.ssh.tunnel --box <exid> --env prep --port 2222 --user ec2-user"
  echo ""
  echo "   options:"
  echo "     --box    instance exid tag (default: declastruct-demo-box)"
  echo "     --nat    NAT exid to resume first (default: demo-nat for demo box)"
  echo "     --env    keyrack env for aws creds (default: prep)"
  echo "     --port   local port to bind the tunnel (default: 2222)"
  echo "     --user   login user to authorize the key for (default: ec2-user)"
  echo "     --help   show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --box) BOX="$2"; shift 2 ;;
    --nat) NAT="$2"; NAT_SET="true"; shift 2 ;;
    --env) ENV="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --user) USER_NAME="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

# default the NAT only for the demo box; a custom --box with no --nat gets none,
# so a public box is not sent a wrong NAT. explicit --nat always wins.
if [[ "$NAT_SET" != "true" && "$BOX" == "$BOX_DEFAULT" ]]; then
  NAT="$NAT_DEFAULT"
fi

echo "🦫 gnaw gnaw..."
echo ""
NAT_LABEL="${NAT:-none}"
echo "🔌 use.ssh.tunnel --box $BOX --nat $NAT_LABEL --env $ENV --port $PORT --user $USER_NAME"

# unlock the keyrack vault so the wish's in-process keyrack.source can read creds.
# note: the spawned `declastruct apply` sources its own creds via the wish, so the
#       shell only needs the vault unlocked (not exported creds).
ensure_creds "$ENV"

# DECLARE + apply the desired state via the wish. the wrapper is authoritative for
# box/nat/port/user; the wish derives the key (machine default) + comment. the DAOs
# drive plan/apply — no imperative set*. resources apply in declared array order:
# NAT (egress) first so the private box can connect, then box, key, tunnel.
echo "   ├─ apply desired state (declarative)..."
( cd "$ROOT" \
    && SSH_BOX_EXID="$BOX" SSH_NAT_EXID="$NAT" SSH_ENV="$ENV" \
       SSH_LOCAL_PORT="$PORT" SSH_USER="$USER_NAME" \
    npx declastruct apply --plan yolo --wish "$HERE/use.ssh.tunnel.ts" ) \
  || die 1 "declastruct apply failed for box=$BOX"

echo "   └─ tunnel open on localhost:$PORT -> $BOX:22 (login user: $USER_NAME)"
echo ""
echo "🦫 dam's solid! ssh in with: ssh -p $PORT $USER_NAME@localhost"
