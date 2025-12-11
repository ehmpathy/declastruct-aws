#!/usr/bin/env bash
# .what = provides dev access to an aws account to test against
# .how = usage (export): source .agent/repo=.this/skills/use.demo.awsprofile.sh

# Fail fast if not sourced
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  echo "Error: This script must be sourced, not executed directly." >&2
  echo "Usage: source ${BASH_SOURCE[0]}" >&2
  exit 1
fi

export AWS_PROFILE="ehmpathy.demo"
export AWS_REGION="us-east-1"

# expected role name for demo user
EXPECTED_ROLE="ehmpathy-demo-sso"

# check if authenticated with correct role
check_correct_identity() {
  local arn
  arn=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null) || return 1
  [[ "$arn" == *"$EXPECTED_ROLE"* ]]
}

# ensure authenticated with correct demo user
if ! check_correct_identity; then
  echo "auth expired or wrong user. logging out and re-authenticating..."
  aws sso logout 2>/dev/null
  aws sso login --profile "$AWS_PROFILE"

  # verify we got the right identity
  if ! check_correct_identity; then
    echo "ERROR: logged in but not as demo user. check browser session." >&2
    return 1
  fi
fi


