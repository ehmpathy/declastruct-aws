#!/usr/bin/env bash
######################################################################
# .what = the echo mailbox responder — read the NEWEST inbound message in the mail
#         bucket, pick a random 🐢/🦫/🦉, and reply to the original sender
#
# .why  = the dogfood that proves BOTH legs of the mail stack in ONE shot: inbound
#         (a real message landed in s3 via mx -> receipt rule) + outbound (a real
#         SendEmail from the verified domain). a downstream CONSUMER of the declared
#         primitives, not a declared resource — so it lives as this skill. this thin
#         wrapper sources aws creds from keyrack and runs echo.reply.ts. mirrors the
#         report.cost.sh creds pattern.
#
# usage:
#   rhx echo.reply                       # env=prep, reply to the newest inbound message
#   rhx echo.reply --env prep            # pick the keyrack env
#   rhx echo.reply --bucket B --from A   # override the mail bucket + echo address
#
# options:
#   --env ENV      keyrack env for aws creds (default: prep)
#   --bucket NAME  the inbound mail bucket (default: ehmpathy-mail-inbound-demo)
#   --from ADDR    the echo reply-from address (default: echo@demo.ehmpathy.com)
#   --help         show usage
#
# guarantee:
#   - exit 0 = replied (or the mailbox was empty — a normal state, not an error)
#   - exit 1 = malfunction (aws error, send failed)
#   - exit 2 = constraint (locked keyrack)
#
# .note = LIVE — reads real s3 objects + sends a real email. SES SANDBOX delivers only to
#   VERIFIED recipients, so the reply reaches the sender only once that address is verified
#   (or the account has production access). email echo@demo.ehmpathy.com from your verified
#   address, then run this to see the round-trip.
######################################################################

set -euo pipefail

SKILL="echo.reply"
ART="🐢"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"

ENV="prep"

# failloud: print a clear error tree to stderr and exit with the given code
die() {
  local code="$1"; local msg="$2"; local hint="${3:-}"
  echo "🐢 bummer dude..." >&2
  echo "$ART $SKILL" >&2
  echo "   ├─ $msg" >&2
  [[ -n "$hint" ]] && echo "   └─ hint: $hint" >&2
  exit "$code"
}

show_help() {
  echo "🐢 heres the deal..."
  echo ""
  echo "🐚 echo.reply"
  echo "   usage:"
  echo "     rhx echo.reply                       # env=prep, reply to the newest inbound message"
  echo "     rhx echo.reply --env prep            # pick the keyrack env"
  echo "     rhx echo.reply --bucket B --from A   # override the mail bucket + echo address"
  echo ""
  echo "   options:"
  echo "     --env      keyrack env for aws creds (default: prep)"
  echo "     --bucket   the inbound mail bucket (default: ehmpathy-mail-inbound-demo)"
  echo "     --from     the echo reply-from address (default: echo@demo.ehmpathy.com)"
  echo "     --help     show this help"
  exit 0
}

# unlock the keyrack vault + source the env's aws profile into this shell
ensure_creds() {
  local env="$1"
  local out
  out=$(rhx keyrack unlock --owner ehmpath --env "$env" 2>&1) \
    || { echo "$out" >&2; die 2 "keyrack unlock failed for env=$env"; }
  eval "$(rhx keyrack source --key AWS_PROFILE --env "$env" --owner ehmpath --lenient)"
  [[ -n "${AWS_PROFILE:-}" ]] \
    || die 2 "no AWS_PROFILE from keyrack for env=$env" "rhx keyrack unlock --owner ehmpath --env $env"
  export AWS_PROFILE
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --env) ENV="$2"; shift 2 ;;
    --bucket) export ECHO_BUCKET="$2"; shift 2 ;;
    --from) export ECHO_FROM="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

echo "🐢 reef check..." >&2
echo "" >&2
echo "🐚 echo.reply --env $ENV" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's clients can read creds
ensure_creds "$ENV"

# read the newest inbound message + reply; the worker logs its result to stdout
( cd "$ROOT" && npx tsx "$HERE/echo.reply.ts" ) \
  || die 1 "echo reply failed for env=$ENV"

echo "" >&2
echo "🐢 cowabunga!" >&2
