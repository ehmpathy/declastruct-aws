#!/usr/bin/env bash
######################################################################
# .what = prove whether the dkim off→on nudge re-arms SES's verification poll
# .why  = a toggle on an already-enabled identity CAN no-op and never reset the FAILED status.
#         this samples dkim.enabled + dkim.status before/after each toggle so we SEE it move —
#         or SEE it does not. thin wrapper: sources aws creds from keyrack, runs the ts worker.
#
# usage:
#   rhx mail.dns.nudgeproof                       # env=prep, domain=demo.ehmpathy.com
#   rhx mail.dns.nudgeproof --env prep --domain mail.foo.com
#
# guarantee:
#   - exit 0 = sampled through the toggle cycle
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (locked keyrack)
######################################################################

set -euo pipefail

SKILL="mail.dns.nudgeproof"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"
ENV="prep"

die() {
  local code="$1"; local msg="$2"
  echo "🐢 bummer dude..." >&2
  echo "🧪 $SKILL" >&2
  echo "   └─ $msg" >&2
  exit "$code"
}

ensure_creds() {
  local env="$1"; local out
  out=$(rhx keyrack unlock --owner ehmpath --env "$env" 2>&1) \
    || { echo "$out" >&2; die 2 "keyrack unlock failed for env=$env"; }
  eval "$(rhx keyrack source --key AWS_PROFILE --env "$env" --owner ehmpath --lenient)"
  [[ -n "${AWS_PROFILE:-}" ]] || die 2 "no AWS_PROFILE from keyrack for env=$env"
  export AWS_PROFILE
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    --domain) export MAIL_DOMAIN="$2"; shift 2 ;;
    --skill) shift 2 ;;
    --repo) shift 2 ;;
    --role) shift 2 ;;
    *) shift ;;
  esac
done

ensure_creds "$ENV"
( cd "$ROOT" && npx tsx "$HERE/mail.dns.nudgeproof.ts" ) || die 1 "nudgeproof failed for env=$ENV"
