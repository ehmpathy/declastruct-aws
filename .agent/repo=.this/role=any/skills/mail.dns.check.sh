#!/usr/bin/env bash
######################################################################
# .what = diagnose why an SES domain identity is not yet verified — read the live
#         expected DKIM tokens from SES, look up the live DKIM CNAMEs from DNS, diff
#
# .why  = when a domain identity sits `unresolved`, the cause is almost always a DKIM
#         CNAME that has not propagated or points at the wrong target. this reads BOTH
#         sides (what AWS expects vs what DNS serves) so the gap is obvious. a read-only
#         probe — no resource mutation. thin wrapper: sources aws creds from keyrack and
#         runs mail.dns.check.ts. mirrors the echo.reply creds pattern.
#
# usage:
#   rhx mail.dns.check                       # env=prep, domain=demo.ehmpathy.com
#   rhx mail.dns.check --env prep            # pick the keyrack env
#   rhx mail.dns.check --domain mail.foo.com # override the mail domain
#   rhx mail.dns.check --nudge               # re-arm dkim re-poll, then re-check
#
# options:
#   --env ENV       keyrack env for aws creds (default: prep)
#   --domain NAME   the mail domain identity to check (default: demo.ehmpathy.com)
#   --nudge         when dkimStatus=FAILED, toggle dkim off→on to force SES to re-poll
#                   the now-live CNAMEs (end state = dkim enabled = the declared state)
#   --help          show usage
#
# guarantee:
#   - exit 0 = probe read + diffed (verified OR still unresolved — both are normal states)
#   - exit 1 = malfunction (aws error, read failed)
#   - exit 2 = constraint (locked keyrack)
######################################################################

set -euo pipefail

SKILL="mail.dns.check"
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
  echo "🔎 mail.dns.check"
  echo "   usage:"
  echo "     rhx mail.dns.check                       # env=prep, domain=demo.ehmpathy.com"
  echo "     rhx mail.dns.check --env prep            # pick the keyrack env"
  echo "     rhx mail.dns.check --domain mail.foo.com # override the mail domain"
  echo ""
  echo "   options:"
  echo "     --env      keyrack env for aws creds (default: prep)"
  echo "     --domain   the mail domain identity to check (default: demo.ehmpathy.com)"
  echo "     --nudge    toggle dkim off→on to force SES to re-poll (use when dkimStatus=FAILED)"
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
    --domain) export MAIL_DOMAIN="$2"; shift 2 ;;
    --nudge) export MAIL_DNS_NUDGE="true"; shift ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

echo "🐢 reef check..." >&2
echo "" >&2
echo "🔎 mail.dns.check --env $ENV" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's client can read creds
ensure_creds "$ENV"

# read the live identity + diff the live dns; the worker logs its result to stdout
( cd "$ROOT" && npx tsx "$HERE/mail.dns.check.ts" ) \
  || die 1 "dns check failed for env=$ENV"

echo "" >&2
echo "🐢 cowabunga!" >&2
