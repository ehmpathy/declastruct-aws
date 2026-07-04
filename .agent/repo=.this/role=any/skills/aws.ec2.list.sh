#!/usr/bin/env bash
######################################################################
# .what = list EC2 instances in the current AWS account
#
# .why  = diagnose vCPU quota usage and orphaned instances
#
# usage:
#   aws.ec2.list.sh --env test              # list all non-terminated instances
#   aws.ec2.list.sh --env test --state running    # filter by state
#
# options:
#   --env ENV       environment for aws credentials: test, prep, prod (required)
#   --state STATE   filter by state: running, stopped, all (default: running,stopped)
#
# note: state values (running, stopped, etc.) are AWS API terms
#
# guarantee:
#   - exit 0 = query completed
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (absent args)
######################################################################

set -euo pipefail

# parse args
STATE_FILTER="running,pending,stopping,stopped"
ENV=""

show_help() {
  echo "🐢 heres the deal..."
  echo ""
  echo "🐚 aws.ec2.list"
  echo "   usage:"
  echo "     rhx aws.ec2.list --env <env>                    # list instances"
  echo "     rhx aws.ec2.list --env <env> --state running    # filter by state"
  echo ""
  echo "   options:"
  echo "     --env       environment: test, prep, prod (required)"
  echo "     --state     filter: running, stopped, all (default: running,stopped)"
  echo "     --help      show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --state) STATE_FILTER="$2"; shift 2 ;;
    --env) ENV="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;  # ignore unknown args
  esac
done

# validate --env (required, no default)
if [[ -z "$ENV" ]]; then
  echo "🐢 bummer dude... --env required" >&2
  echo "   └─ hint: rhx aws.ec2.list --env test" >&2
  exit 2
fi

if [[ "$STATE_FILTER" == "all" ]]; then
  STATE_FILTER="running,pending,stopping,stopped,terminated"
fi

# source aws credentials from keyrack (skip if already set)
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  AWS_PROFILE=$(rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value 2>/dev/null || echo "")
  if [[ -z "$AWS_PROFILE" ]]; then
    echo "🐢 bummer dude..."
    echo ""
    echo "🐚 aws.ec2.list"
    echo "   ├─ absent AWS_PROFILE from keyrack for env=$ENV"
    echo "   └─ hint: rhx keyrack unlock --owner ehmpath --env $ENV"
    exit 1
  fi
  export AWS_PROFILE
fi

echo "🐢 reef check..."
echo ""
echo "🐚 aws.ec2.list --env $ENV --state $STATE_FILTER"

RESULT=$(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=$STATE_FILTER" \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,LaunchTime,Tags[?Key==`Name`].Value|[0],Tags[?Key==`Purpose`].Value|[0]]' \
  --output text 2>&1) || {
  echo "   └─ 🐢 bummer dude... $RESULT" >&2
  exit 1
}

if [[ -z "$RESULT" || "$RESULT" == "None" ]]; then
  echo "   └─ (no instances found)"
  exit 0
fi

# count instances
TOTAL=$(echo "$RESULT" | grep -c . || echo "0")
echo "   ├─ found: $TOTAL instances"
echo "   └─ instances"

# output as tree
echo "$RESULT" | while IFS=$'\t' read -r ID TYPE STATE LAUNCH NAME PURPOSE; do
  NAME=${NAME:-"(unnamed)"}
  PURPOSE=${PURPOSE:-"(no purpose tag)"}
  LAUNCH_DATE=$(echo "$LAUNCH" | cut -d'T' -f1)
  echo "      ├─ $ID"
  echo "      │  ├─ type: $TYPE"
  echo "      │  ├─ state: $STATE"
  echo "      │  ├─ launched: $LAUNCH_DATE"
  echo "      │  ├─ name: $NAME"
  echo "      │  └─ purpose: $PURPOSE"
done

echo ""
echo "🐢 cowabunga!"
