#!/usr/bin/env bash
# .what = provides dev access to an aws account to test against
# .how = usage (export): source .agent/repo=.this/skills/use.dev.awsprofile.sh

# Fail fast if not sourced
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  echo "Error: This script must be sourced, not executed directly." >&2
  echo "Usage: source ${BASH_SOURCE[0]}" >&2
  exit 1
fi

export AWS_PROFILE="ahbode.dev"
export AWS_REGION="us-east-1"


