#!/usr/bin/env bash
######################################################################
# .what = list and prune SSM sessions (the orphans test teardown leaves)
#
# .why  = terminating a test instance never cleanly disconnects the SSM
#         port-forward session it held, so the control plane leaves those
#         sessions stuck "Active" forever. this lists them and prunes the
#         orphans (sessions whose target instance no longer exists).
#         - the aws.ssh.* skills never leak sessions; the integration
#           tests do (they kill the instance out from under the session)
#         - mirrors the both-ends cleanup rule: prune orphans in beforeAll,
#           terminate your own session in afterAll
#
# usage:
#   aws.ssm.sessions.sh                                  # list active sessions
#   aws.ssm.sessions.sh --prune orphans                  # plan: orphans only
#   aws.ssm.sessions.sh --prune orphans --mode apply     # terminate orphans
#   aws.ssm.sessions.sh --prune target=i-0abc --mode apply   # one box's sessions
#   aws.ssm.sessions.sh --prune all --mode apply         # terminate every session
#
# options:
#   --env ENV     keyrack env for aws creds (default: prep)
#   --prune WHAT  orphans (default) | all | target=<instance-id>
#   --mode MODE   plan (default) or apply
#   --help        show usage
#
# guarantee:
#   - exit 0 = listed, or pruned (or plan shown)
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (locked keyrack, auth failed, bad args)
######################################################################

set -euo pipefail

SKILL="aws.ssm.sessions"
ART="🧹"
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
}

ENV="prep"
PRUNE=""
MODE="plan"

show_help() {
  echo "🦫 heres the build..."
  echo ""
  echo "🧹 aws.ssm.sessions"
  echo "   usage:"
  echo "     rhx aws.ssm.sessions                            # list active sessions"
  echo "     rhx aws.ssm.sessions --prune orphans            # plan: orphans only"
  echo "     rhx aws.ssm.sessions --prune orphans --mode apply"
  echo "     rhx aws.ssm.sessions --prune target=i-0abc --mode apply"
  echo "     rhx aws.ssm.sessions --prune all --mode apply"
  echo ""
  echo "   options:"
  echo "     --env    keyrack env for aws creds (default: prep)"
  echo "     --prune  orphans (default) | all | target=<instance-id>"
  echo "     --mode   plan (default) or apply"
  echo "     --help   show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --env) ENV="$2"; shift 2 ;;
    --prune) PRUNE="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --skill) shift 2 ;;
    --repo) shift 2 ;;
    --role) shift 2 ;;
    *) shift ;;
  esac
done

echo "🦫 gnaw gnaw..."
echo ""
echo "🧹 aws.ssm.sessions --env $ENV${PRUNE:+ --prune $PRUNE --mode $MODE}"

# unlock keyrack + source the env profile so the aws cli calls below authenticate
ensure_creds "$ENV"

# fetch active sessions as "sessionId<tab>target" lines
SESSIONS=$(aws ssm describe-sessions --state Active \
  --query "Sessions[].[SessionId,Target]" --output text 2>&1) \
  || die 1 "aws describe-sessions failed: $SESSIONS"

if [[ -z "$SESSIONS" || "$SESSIONS" == "None" ]]; then
  echo "   └─ no active sessions"
  echo ""
  echo "🦫 all clear!"
  exit 0
fi

TOTAL=$(echo "$SESSIONS" | grep -c . || echo 0)
echo "   ├─ active sessions: $TOTAL"

# fetch the set of instance ids that still exist (non-terminated), so we can
# tell an orphan (target gone) from a live session
LIVE_IDS=$(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running,pending,stopping,stopped" \
  --query "Reservations[].Instances[].InstanceId" --output text 2>&1) \
  || die 1 "aws describe-instances failed: $LIVE_IDS"

# decide which sessions to terminate
TARGETS_TO_KILL=()
PRUNE_INSTANCE=""
[[ "$PRUNE" == target=* ]] && PRUNE_INSTANCE="${PRUNE#target=}"

echo "   └─ sessions"
while IFS=$'\t' read -r SID TARGET; do
  [[ -z "$SID" ]] && continue
  # is the target instance still alive?
  ALIVE="no"
  case " $LIVE_IDS " in *" $TARGET "*) ALIVE="yes" ;; esac

  MARK="live"
  KILL="no"
  if [[ -n "$PRUNE" ]]; then
    case "$PRUNE" in
      all) KILL="yes" ;;
      orphans) [[ "$ALIVE" == "no" ]] && KILL="yes" ;;
      target=*) [[ "$TARGET" == "$PRUNE_INSTANCE" ]] && KILL="yes" ;;
      *) die 2 "unknown --prune '$PRUNE'" "use: orphans | all | target=<instance-id>" ;;
    esac
  fi
  [[ "$ALIVE" == "no" ]] && MARK="orphan"
  [[ "$KILL" == "yes" ]] && { MARK="$MARK → terminate"; TARGETS_TO_KILL+=("$SID"); }

  echo "      ├─ $SID -> $TARGET ($MARK)"
done <<< "$SESSIONS"

# no prune requested => list only
if [[ -z "$PRUNE" ]]; then
  echo ""
  echo "🦫 that's the lay of the land. prune with: rhx aws.ssm.sessions --prune orphans --mode apply"
  exit 0
fi

KILL_COUNT=${#TARGETS_TO_KILL[@]}
if [[ "$KILL_COUNT" -eq 0 ]]; then
  echo ""
  echo "🦫 no sessions to prune for --prune $PRUNE!"
  exit 0
fi

# plan mode: show what would be terminated, change none
if [[ "$MODE" != "apply" ]]; then
  echo ""
  echo "🦫 plan: would terminate $KILL_COUNT session(s). re-run with --mode apply"
  exit 0
fi

# apply mode: terminate each flagged session
echo "   ├─ terminate $KILL_COUNT session(s)..."
for SID in "${TARGETS_TO_KILL[@]}"; do
  OUT=$(aws ssm terminate-session --session-id "$SID" --query "SessionId" --output text 2>&1) \
    || die 1 "aws terminate-session failed for $SID: $OUT"
  echo "      ├─ terminated $SID"
done

echo "   └─ pruned $KILL_COUNT session(s)"
echo ""
echo "🦫 dam's clean!"
