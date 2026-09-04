#!/usr/bin/env bash
######################################################################
# .what = the echo mailbox initiator — send a FRESH (non-reply) email from the
#         verified domain to a chosen recipient, with a random 🐢/🦫/🦉 hello
#
# .why  = the outbound-only companion to echo.reply: echo.reply proves the
#         round-trip (inbound -> outbound), this proves the outbound leg ALONE —
#         a real SendEmail from the verified domain, no prior inbound message
#         needed. a downstream CONSUMER of the declared primitives, not a
#         declared resource — so it lives as this skill. this thin wrapper
#         sources aws creds from keyrack and runs echo.send.ts.
#
# usage:
#   rhx echo.send                        # env=prep, email vlad@ahbode.com
#   rhx echo.send --env prep             # pick the keyrack env
#   rhx echo.send --to a@b.com           # override the recipient
#   rhx echo.send --from A --subject S   # override the from address + subject
#
# options:
#   --env ENV       keyrack env for aws creds (default: prep)
#   --to ADDR       the recipient (default: vlad@ahbode.com)
#   --from ADDR     the echo send-from address (default: echo@demo.ehmpathy.com)
#   --subject TEXT  the email subject (default: hello from the echo mailbox 🐢)
#   --help          show usage
#
# guarantee:
#   - exit 0 = sent
#   - exit 1 = malfunction (aws error, send failed)
#   - exit 2 = constraint (locked keyrack)
#
# .note = LIVE — sends a real email. SES SANDBOX delivers only to VERIFIED
#   recipients, so the message reaches the recipient only once that address is
#   verified (or the account has production access).
######################################################################

set -euo pipefail

SKILL="echo.send"
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
  echo "🐚 echo.send"
  echo "   usage:"
  echo "     rhx echo.send                        # env=prep, email vlad@ahbode.com"
  echo "     rhx echo.send --env prep             # pick the keyrack env"
  echo "     rhx echo.send --to a@b.com           # override the recipient"
  echo "     rhx echo.send --from A --subject S   # override the from + subject"
  echo ""
  echo "   options:"
  echo "     --env      keyrack env for aws creds (default: prep)"
  echo "     --to       the recipient (default: vlad@ahbode.com)"
  echo "     --from     the echo send-from address (default: echo@demo.ehmpathy.com)"
  echo "     --subject  the email subject"
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
    --to) export ECHO_TO="$2"; shift 2 ;;
    --from) export ECHO_FROM="$2"; shift 2 ;;
    --subject) export ECHO_SUBJECT="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

echo "🐢 reef check..." >&2
echo "" >&2
echo "🐚 echo.send --env $ENV" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's client can read creds
ensure_creds "$ENV"

# send the fresh email; the worker logs its result to stdout
( cd "$ROOT" && npx tsx "$HERE/echo.send.ts" ) \
  || die 1 "echo send failed for env=$ENV"

echo "" >&2
echo "🐢 cowabunga!" >&2
