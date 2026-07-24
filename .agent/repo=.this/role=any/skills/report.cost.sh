#!/usr/bin/env bash
######################################################################
# .what = read the declarative cost-report resources + emit a human-readable
#         markdown report (composition, trend, forecast, savings) to stdout
#
# .why  = a cost report is READ-ONLY — you do not `apply` it, you READ it.
#         this thin wrapper sources aws creds from keyrack and runs the
#         report.cost.ts worker, which reads each report via its DAO
#         (DAO.get.one.byUnique) and formats the resolved money numbers
#         into markdown. mirrors the use.ssh.tunnel.sh creds pattern.
#
# usage:
#   rhx report.cost                          # env=prep, print to stdout
#   rhx report.cost --env prep               # pick the keyrack env
#   rhx report.cost --out cost.md            # also write the report to a file
#
# options:
#   --env ENV    keyrack env for aws creds (default: prep)
#   --out FILE   also write the markdown to FILE (relative to repo root)
#   --help       show usage
#
# guarantee:
#   - exit 0 = report read + emitted
#   - exit 1 = malfunction (aws error, read failed)
#   - exit 2 = constraint (locked keyrack)
#
# .note = LIVE + billed — each report is a real Cost Explorer read
#   ($0.01/request), served from the on-disk cache within its ttl. run it
#   deliberately, not in a loop.
######################################################################

set -euo pipefail

SKILL="report.cost"
ART="🐢"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"

ENV="prep"
OUT=""

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
  echo "🐚 report.cost"
  echo "   usage:"
  echo "     rhx report.cost                   # env=prep, print to stdout"
  echo "     rhx report.cost --env prep        # pick the keyrack env"
  echo "     rhx report.cost --out cost.md     # also write the report to a file"
  echo ""
  echo "   options:"
  echo "     --env    keyrack env for aws creds (default: prep)"
  echo "     --out    also write the markdown to a file (repo-root relative)"
  echo "     --help   show this help"
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
    --out) OUT="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

echo "🐢 reef check..." >&2
echo "" >&2
echo "🐚 report.cost --env $ENV" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's provider can read creds
ensure_creds "$ENV"

# read the reports + build the markdown. the worker logs the markdown to stdout;
# tee it to --out when asked, so the report reaches both the terminal and the file.
if [[ -n "$OUT" ]]; then
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.ts" ) | tee "$ROOT/$OUT" \
    || die 1 "cost report read failed for env=$ENV"
  echo "" >&2
  echo "🐢 cowabunga! wrote $OUT" >&2
else
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.ts" ) \
    || die 1 "cost report read failed for env=$ENV"
  echo "" >&2
  echo "🐢 cowabunga!" >&2
fi
