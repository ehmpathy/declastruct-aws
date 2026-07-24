#!/usr/bin/env bash
######################################################################
# .what = diagnose a spend change — group OBSERVED spend by service / usage-type /
#         tag and rank the movers (prior window vs recent window)
#
# .why  = report.cost shows THAT spend trended up; this peer skill answers WHY —
#         which service or tag drove the step-up. it sources aws creds from keyrack
#         and runs the report.cost.diagnose.ts worker, which reads ONE daily
#         SpendObserved report over the last 2×window days, splits it into a prior
#         half + a recent half, and diffs each group so the biggest movers surface.
#
# usage:
#   rhx report.cost.diagnose                          # by SERVICE, 14-day windows
#   rhx report.cost.diagnose --group USAGE_TYPE       # by usage type
#   rhx report.cost.diagnose --group tag:env          # by a cost-allocation tag
#   rhx report.cost.diagnose --window 30              # 30-day prior vs 30-day recent
#   rhx report.cost.diagnose --filter 'SERVICE=Amazon Elastic Compute Cloud - Compute'
#   rhx report.cost.diagnose --out diagnosis.md       # also write to a file
#
# options:
#   --env ENV      keyrack env for aws creds (default: prep)
#   --group AXIS   group axis: a dimension (SERVICE, USAGE_TYPE, REGION, ...) or
#                  tag:<key> (default: SERVICE)
#   --window N     days per comparison window (default: 14)
#   --metric M     cost metric (default: UnblendedCost)
#   --filter F     drill into one dimension: 'DIM=value1,value2'
#   --out FILE     also write the markdown to FILE (repo-root relative)
#   --help         show usage
#
# guarantee:
#   - exit 0 = diagnosis read + emitted
#   - exit 1 = malfunction (aws error, read failed)
#   - exit 2 = constraint (locked keyrack)
#
# .note = LIVE + billed — one Cost Explorer read ($0.01/request), served from the
#   on-disk cache within its ttl. run it deliberately, not in a loop.
######################################################################

set -euo pipefail

SKILL="report.cost.diagnose"
ART="🐢"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"

ENV="prep"
OUT=""
WORKER_ARGS=()

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
  echo "🐢 tail's twitchin..."
  echo ""
  echo "🐚 report.cost.diagnose"
  echo "   usage:"
  echo "     rhx report.cost.diagnose                     # by SERVICE, 14-day windows"
  echo "     rhx report.cost.diagnose --group USAGE_TYPE  # by usage type"
  echo "     rhx report.cost.diagnose --group tag:env     # by a cost-allocation tag"
  echo "     rhx report.cost.diagnose --window 30         # 30-day windows"
  echo "     rhx report.cost.diagnose --filter 'SERVICE=EC2 - Other'"
  echo ""
  echo "   options:"
  echo "     --env      keyrack env for aws creds (default: prep)"
  echo "     --group    axis: a dimension or tag:<key> (default: SERVICE)"
  echo "     --window   days per comparison window (default: 14)"
  echo "     --metric   cost metric (default: UnblendedCost)"
  echo "     --filter   drill into one dimension: 'DIM=value1,value2'"
  echo "     --out      also write the markdown to a file (repo-root relative)"
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
    --out) OUT="$2"; shift 2 ;;
    --group) WORKER_ARGS+=(--group "$2"); shift 2 ;;
    --window) WORKER_ARGS+=(--window "$2"); shift 2 ;;
    --metric) WORKER_ARGS+=(--metric "$2"); shift 2 ;;
    --filter) WORKER_ARGS+=(--filter "$2"); shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;
  esac
done

echo "🐢 smells fishy... let's sniff it out" >&2
echo "" >&2
echo "🐚 report.cost.diagnose --env $ENV ${WORKER_ARGS[*]:-}" >&2

# unlock the vault + export AWS_PROFILE so the tsx worker's provider can read creds
ensure_creds "$ENV"

# read the daily SpendObserved report + diff the windows. the worker logs the markdown
# to stdout; tee it to --out when asked, so it reaches both the terminal and the file.
if [[ -n "$OUT" ]]; then
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.diagnose.ts" "${WORKER_ARGS[@]}" ) | tee "$ROOT/$OUT" \
    || die 1 "cost diagnosis read failed for env=$ENV"
  echo "" >&2
  echo "🐢 caught it! wrote $OUT" >&2
else
  ( cd "$ROOT" && npx tsx "$HERE/report.cost.diagnose.ts" "${WORKER_ARGS[@]}" ) \
    || die 1 "cost diagnosis read failed for env=$ENV"
  echo "" >&2
  echo "🐢 caught it!" >&2
fi
