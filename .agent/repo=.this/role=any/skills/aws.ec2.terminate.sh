#!/usr/bin/env bash
######################################################################
# .what = terminate EC2 instances in the current AWS account
#
# .why  = clean up orphaned test instances that consume vCPU quota
#
# usage:
#   aws.ec2.terminate.sh --env test --ids i-123,i-456    # terminate specific
#   aws.ec2.terminate.sh --env test --all-test           # terminate all test-tagged
#   aws.ec2.terminate.sh --env test --all-untagged       # terminate all untagged
#
# options:
#   --env ENV         environment for aws credentials: test, prep, prod (required)
#   --ids IDS         comma-separated instance IDs to terminate
#   --all-test        terminate all instances tagged Purpose=integration-test
#   --all-untagged    terminate all instances without Purpose tag
#   --mode MODE       plan (default) or apply
#
# note: 'running' and 'stopped' are AWS API state names
#
# guarantee:
#   - exit 0 = terminated (or plan shown)
#   - exit 1 = malfunction (aws error)
#   - exit 2 = constraint (absent args)
######################################################################

set -euo pipefail

# parse args
ENV=""
IDS=""
ALL_TEST=false
ALL_UNTAGGED=false
MODE="plan"

show_help() {
  echo "🐢 heres the deal..."
  echo ""
  echo "🐚 aws.ec2.terminate"
  echo "   usage:"
  echo "     rhx aws.ec2.terminate --env <env> --ids i-123,i-456"
  echo "     rhx aws.ec2.terminate --env <env> --all-test"
  echo "     rhx aws.ec2.terminate --env <env> --all-untagged"
  echo ""
  echo "   options:"
  echo "     --env           environment: test, prep, prod (required)"
  echo "     --ids           comma-separated instance IDs"
  echo "     --all-test      terminate all Purpose=integration-test instances"
  echo "     --all-untagged  terminate all instances without Purpose tag"
  echo "     --mode          plan (default) or apply"
  echo "     --help          show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --env) ENV="$2"; shift 2 ;;
    --ids) IDS="$2"; shift 2 ;;
    --all-test) ALL_TEST=true; shift ;;
    --all-untagged) ALL_UNTAGGED=true; shift ;;
    --mode) MODE="$2"; shift 2 ;;
    --skill) shift 2 ;;  # ignore rhx passthrough
    --repo) shift 2 ;;   # ignore rhx passthrough
    --role) shift 2 ;;   # ignore rhx passthrough
    *) shift ;;  # ignore unknown args
  esac
done

# validate --env (required)
if [[ -z "$ENV" ]]; then
  echo "🐢 bummer dude... --env required" >&2
  exit 2
fi

# validate at least one target specified
if [[ -z "$IDS" && "$ALL_TEST" == "false" && "$ALL_UNTAGGED" == "false" ]]; then
  echo "🐢 bummer dude... specify --ids, --all-test, or --all-untagged" >&2
  exit 2
fi

# source aws credentials from keyrack
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
  AWS_PROFILE=$(rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value 2>/dev/null || echo "")
  if [[ -z "$AWS_PROFILE" ]]; then
    echo "🐢 bummer dude..."
    echo ""
    echo "🐚 aws.ec2.terminate"
    echo "   ├─ absent AWS_PROFILE from keyrack for env=$ENV"
    echo "   └─ hint: rhx keyrack unlock --owner ehmpath --env $ENV"
    exit 1
  fi
  export AWS_PROFILE
fi

# collect instance IDs to terminate
INSTANCE_IDS=()

if [[ -n "$IDS" ]]; then
  IFS=',' read -ra INSTANCE_IDS <<< "$IDS"
fi

if [[ "$ALL_TEST" == "true" ]]; then
  # find all instances tagged Purpose=integration-test
  RESULT=$(aws ec2 describe-instances \
    --filters "Name=tag:Purpose,Values=integration-test" \
              "Name=instance-state-name,Values=running,stopped" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text 2>&1) || {
    echo "🐢 bummer dude... $RESULT" >&2
    exit 1
  }
  if [[ -n "$RESULT" && "$RESULT" != "None" ]]; then
    read -ra TEST_IDS <<< "$RESULT"
    INSTANCE_IDS+=("${TEST_IDS[@]}")
  fi
fi

if [[ "$ALL_UNTAGGED" == "true" ]]; then
  # find all instances without Purpose tag
  # AWS doesn't support "tag not exists" filter, so we get all and filter
  ALL_INSTANCES=$(aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running,stopped" \
    --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==`Purpose`].Value|[0]]' \
    --output text 2>&1) || {
    echo "🐢 bummer dude... $ALL_INSTANCES" >&2
    exit 1
  }

  while IFS=$'\t' read -r ID PURPOSE; do
    if [[ "$PURPOSE" == "None" || -z "$PURPOSE" ]]; then
      INSTANCE_IDS+=("$ID")
    fi
  done <<< "$ALL_INSTANCES"
fi

# dedupe
INSTANCE_IDS=($(printf "%s\n" "${INSTANCE_IDS[@]}" | sort -u))

if [[ ${#INSTANCE_IDS[@]} -eq 0 ]]; then
  echo "🐢 all clear..."
  echo ""
  echo "🐚 aws.ec2.terminate --env $ENV"
  echo "   └─ no instances to terminate"
  exit 0
fi

# show plan
if [[ "$MODE" == "plan" ]]; then
  echo "🐢 heres the wave..."
  echo ""
  echo "🐚 aws.ec2.terminate --env $ENV --mode plan"
  echo "   ├─ would terminate: ${#INSTANCE_IDS[@]} instances"
  echo "   └─ instances"
  for ID in "${INSTANCE_IDS[@]}"; do
    echo "      ├─ $ID"
  done
  echo ""
  echo "   └─ to apply: rhx aws.ec2.terminate --env $ENV ${IDS:+--ids $IDS }${ALL_TEST:+--all-test }${ALL_UNTAGGED:+--all-untagged }--mode apply"
  exit 0
fi

# apply
echo "🐢 shell yeah!"
echo ""
echo "🐚 aws.ec2.terminate --env $ENV --mode apply"
echo "   ├─ terminate: ${#INSTANCE_IDS[@]} instances"

aws ec2 terminate-instances --instance-ids "${INSTANCE_IDS[@]}" > /dev/null 2>&1 || {
  echo "   └─ 🐢 bummer dude... termination failed" >&2
  exit 1
}

echo "   └─ terminated"
for ID in "${INSTANCE_IDS[@]}"; do
  echo "      ├─ $ID ✓"
done

echo ""
echo "🐢 cowabunga!"
