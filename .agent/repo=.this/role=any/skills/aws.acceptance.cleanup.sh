#!/usr/bin/env bash
######################################################################
# .what = cleanup acceptance test EC2 resources
#
# .why  = launch templates are immutable; when properties change,
#         old resources must be deleted before recreate
#
# usage:
#   aws.acceptance.cleanup.sh --env test
#   aws.acceptance.cleanup.sh --env test --mode apply
#
# options:
#   --env ENV       environment for aws credentials: test (required)
#   --mode MODE     plan (default) or apply
#
# guarantee:
#   - exit 0 = cleanup completed (or plan shown)
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (absent args)
######################################################################

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../../.." && pwd)"

# defaults
ENV=""
MODE="plan"

# parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --help|-h)
      head -30 "$0" | tail -25
      exit 0
      ;;
    --skill|--repo|--role)
      shift 2  # ignore rhx passthrough
      ;;
    *)
      shift  # ignore unknown args
      ;;
  esac
done

# validate required args
if [[ -z "$ENV" ]]; then
  echo "error: --env is required" >&2
  exit 2
fi

if [[ "$ENV" != "test" ]]; then
  echo "error: --env must be 'test' (acceptance tests run against test env)" >&2
  exit 2
fi

# source aws credentials from keyrack
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  AWS_PROFILE=$(rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value 2>/dev/null || echo "")
  if [[ -z "$AWS_PROFILE" ]]; then
    echo "🐢 bummer dude..."
    echo ""
    echo "🐚 aws.acceptance.cleanup"
    echo "   ├─ absent AWS_PROFILE from keyrack for env=$ENV"
    echo "   └─ hint: rhx keyrack unlock --owner ehmpath --env $ENV"
    exit 1
  fi
  export AWS_PROFILE
fi

cd "$REPO_ROOT"

if [[ "$MODE" == "plan" ]]; then
  echo ""
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 aws.acceptance.cleanup --env $ENV --mode plan"
  echo "   ├─ will delete: declastruct-acceptance-instance"
  echo "   └─ will delete: declastruct-acceptance-template"
  echo ""
  echo "to apply: aws.acceptance.cleanup.sh --env $ENV --mode apply"
  exit 0
fi

# apply mode
echo ""
echo "🐢 cleaning up acceptance test resources..."
echo ""

# run collocated cleanup ts file via local tsx binary
"$REPO_ROOT/node_modules/.bin/tsx" "$SKILL_DIR/aws.acceptance.cleanup.ts"

echo ""
echo "🐢 cowabunga! cleanup complete"
