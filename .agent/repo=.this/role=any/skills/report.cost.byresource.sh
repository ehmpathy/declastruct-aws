#!/usr/bin/env bash
######################################################################
# .what = read the by-RESOURCE_ID cost report + emit a per-EC2-instance cost
#         breakdown (instance id joined to its Name tag) as markdown
#
# .why  = report.cost / report.cost.diagnose stop at the SERVICE grain; this drills
#         to the exact instance. Cost Explorer returns per-resource dollars natively
#         (no price inference), but only instance IDS — so the worker cross-refs
#         DescribeInstances to attach the friendly Name tag. this thin wrapper sources
#         aws creds from keyrack and runs report.cost.byresource.ts.
#
# usage:
#   rhx report.cost.byresource                # env=prep, print to stdout
#   rhx report.cost.byresource --env prep     # pick the keyrack env
#   rhx report.cost.byresource --out cost.md  # also write the report to a file
#
# options:
#   --env ENV    keyrack env for aws creds (default: prep)
#   --out FILE   also write the markdown to FILE (repo-root relative)
#   --help       show usage
#
# guarantee:
#   - exit 0 = report read + emitted
#   - exit 1 = malfunction (aws error, read failed)
#   - exit 2 = constraint (locked keyrack)
#
# .note = LIVE + billed — one Cost Explorer read ($0.01/request), served from the
#   on-disk cache within its ttl. requires the FREE "resource-level data at daily
#   granularity" opt-in (only the separate hourly tier is paid); when off, the report
#   is empty + prints provision guidance.
# .note = 14-DAY CAP — resource-level data is retained ~14 days, so the window is bounded.
######################################################################

set -euo pipefail

SKILL="report.cost.byresource"
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
  echo "🐚 report.cost.byresource"
  echo "   usage:"
  echo "     rhx report.cost.byresource                # env=prep, print to stdout"
  echo "     rhx report.cost.byresource --env prep     # pick the keyrack env"
  echo "     rhx report.cost.byresource --out cost.md  # also write the report to a file"
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

echo "🐢 tail's twitchin... per-instance sniff" >&2
echo "" >&2
echo "🐚 report.cost.byresource --env $ENV" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's provider can read creds
ensure_creds "$ENV"

# read the report + join ids to names. the worker logs the markdown to stdout; tee it to
# --out when asked, so the report reaches both the terminal and the file.
if [[ -n "$OUT" ]]; then
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.byresource.ts" ) | tee "$ROOT/$OUT" \
    || die 1 "by-resource cost report read failed for env=$ENV"
  echo "" >&2
  echo "🐢 caught it! wrote $OUT" >&2
else
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.byresource.ts" ) \
    || die 1 "by-resource cost report read failed for env=$ENV"
  echo "" >&2
  echo "🐢 caught it!" >&2
fi
