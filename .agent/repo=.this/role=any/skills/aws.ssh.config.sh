#!/usr/bin/env bash
######################################################################
# .what = register a declastruct EC2 box as a Host in ~/.ssh/config
#
# .why  = lets you `ssh <alias>` with zero ceremony — the Host block
#         carries a ProxyCommand that tunnels over SSM automatically
#         - no public IP, no port 22 exposure, no manual tunnel
#         - findsert: re-running upserts the same Host block in place
#         - IdentityFile defaults to YOUR own key (id_ed25519, then id_rsa)
#         - embeds the live instance id, your key, region, and profile
#
# usage:
#   aws.ssh.config.sh                                    # alias=box=declastruct-demo-box
#   aws.ssh.config.sh --box declastruct-demo-box --alias demo --env prep
#   aws.ssh.config.sh --key ~/.ssh/id_ed25519 --user ec2-user
#
# options:
#   --box BOX      instance exid tag (default: declastruct-demo-box)
#   --alias NAME   ssh Host alias (default: same as --box)
#   --env ENV      keyrack env for aws creds (default: prep)
#   --key PATH     private key IdentityFile (default: your own key)
#   --user USER    login user on the box (default: ec2-user)
#   --help         show usage
#
# guarantee:
#   - exit 0 = Host block written to ~/.ssh/config
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (locked keyrack, auth failed, box not found)
######################################################################

set -euo pipefail

SKILL="aws.ssh.config"
ART="🗒️"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
  # source our own profile into the shell so the aws cli calls below authenticate
  eval "$(rhx keyrack source --key AWS_PROFILE --env "$env" --owner ehmpath --lenient)"
  [[ -n "${AWS_PROFILE:-}" ]] \
    || die 2 "no AWS_PROFILE from keyrack for env=$env" "rhx keyrack unlock --owner ehmpath --env $env"
  export AWS_PROFILE
  # pin region from the profile so the ProxyCommand is deterministic
  REGION=$(aws configure get region --profile "$AWS_PROFILE" 2>/dev/null || echo us-east-1)
  export AWS_REGION="$REGION" AWS_DEFAULT_REGION="$REGION" REGION
}

BOX="declastruct-demo-box"
ALIAS=""
ENV="prep"
KEY=""           # empty => pick your own key below
USER_NAME="ec2-user"

# aws instance-state-name values to match (api literals)
STATES="running,pending,stopping,stopped"

show_help() {
  echo "🦫 heres the build..."
  echo ""
  echo "🗒️ aws.ssh.config"
  echo "   usage:"
  echo "     rhx aws.ssh.config                               # alias=declastruct-demo-box"
  echo "     rhx aws.ssh.config --box <exid> --alias demo"
  echo ""
  echo "   options:"
  echo "     --box    instance exid tag (default: declastruct-demo-box)"
  echo "     --alias  ssh Host alias (default: same as --box)"
  echo "     --env    keyrack env for aws creds (default: prep)"
  echo "     --key    private key IdentityFile (default: your own key)"
  echo "     --user   login user on the box (default: ec2-user)"
  echo "     --help   show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --box) BOX="$2"; shift 2 ;;
    --alias) ALIAS="$2"; shift 2 ;;
    --env) ENV="$2"; shift 2 ;;
    --key) KEY="$2"; shift 2 ;;
    --user) USER_NAME="$2"; shift 2 ;;
    --skill) shift 2 ;;
    --repo) shift 2 ;;
    --role) shift 2 ;;
    *) shift ;;
  esac
done

ALIAS="${ALIAS:-$BOX}"

# pick your own key by default: id_ed25519, then id_rsa; an explicit --key wins
if [[ -z "$KEY" ]]; then
  if [[ -f "$HOME/.ssh/id_ed25519.pub" ]]; then
    KEY="$HOME/.ssh/id_ed25519"
  elif [[ -f "$HOME/.ssh/id_rsa.pub" ]]; then
    KEY="$HOME/.ssh/id_rsa"
  else
    KEY="$HOME/.ssh/declastruct-demo"
  fi
fi

echo "🦫 gnaw gnaw..."
echo ""
echo "🗒️ aws.ssh.config --box $BOX --alias $ALIAS"

# unlock keyrack + source the env profile so the aws cli calls below authenticate
ensure_creds "$ENV"

# look up the instance id from the exid tag (auth already verified above)
IID=$(aws ec2 describe-instances \
  --filters "Name=tag:exid,Values=$BOX" \
            "Name=instance-state-name,Values=$STATES" \
  --query "Reservations[0].Instances[0].InstanceId" --output text 2>&1) \
  || die 1 "aws describe-instances failed: $IID"
[[ -n "$IID" && "$IID" != "None" ]] \
  || die 2 "no box tagged exid=$BOX for profile $AWS_PROFILE" "check the exid, or provision it first"
echo "   ├─ box: $IID"

# build the ProxyCommand that tunnels ssh over SSM
# note: %h = HostName (the instance id), %p = port
PROXY="aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters portNumber=%p --region $REGION --profile $AWS_PROFILE"

SSH_CONFIG="$HOME/.ssh/config"
mkdir -p "$HOME/.ssh"
touch "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"

MARK_BEGIN="# >>> $ALIAS (managed by aws.ssh.config)"
MARK_END="# <<< $ALIAS"

# upsert: drop any prior block for this alias, then append the fresh one
if grep -qF "$MARK_BEGIN" "$SSH_CONFIG"; then
  echo "   ├─ upsert prior Host block for $ALIAS"
  awk -v b="$MARK_BEGIN" -v e="$MARK_END" '
    $0==b {skip=1}
    skip==0 {print}
    $0==e {skip=0; next}
  ' "$SSH_CONFIG" > "$SSH_CONFIG.tmp" || die 1 "failed to rewrite $SSH_CONFIG"
  mv "$SSH_CONFIG.tmp" "$SSH_CONFIG"
  chmod 600 "$SSH_CONFIG"
fi

{
  echo "$MARK_BEGIN"
  echo "Host $ALIAS"
  echo "  HostName $IID"
  echo "  User $USER_NAME"
  echo "  IdentityFile $KEY"
  echo "  StrictHostKeyChecking no"
  echo "  UserKnownHostsFile /dev/null"
  echo "  ProxyCommand sh -c \"$PROXY\""
  echo "$MARK_END"
} >> "$SSH_CONFIG" || die 1 "failed to write Host block into $SSH_CONFIG"

echo "   ├─ wrote Host '$ALIAS' -> $IID into $SSH_CONFIG"
echo "   ├─ identity: $KEY"
echo "   └─ tunnels over SSM (region=$REGION, profile=$AWS_PROFILE)"
echo ""
echo "🦫 all wired up! open the tunnel with: rhx use.ssh.tunnel --box $BOX  (then: ssh $ALIAS)"
