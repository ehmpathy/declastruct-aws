#!/usr/bin/env bash
######################################################################
# .what = fill provision/aws.auth/account=.root/.env from live aws
#
# .why  = the root plan reads three values that are not checked in
#         (SSO_ADMIN_USERNAME, SSO_ADMIN_EMAIL, SSO_DEMO_EMAIL). a fresh
#         worktree lacks the .env; this reads the values off the live
#         org + identity center, so no human retypes them
#
# usage:
#   rhx aws.auth.root.env                    # plan: show the values
#   rhx aws.auth.root.env --mode apply       # write the .env
#   rhx aws.auth.root.env --profile <p>      # default: ehmpathy.root.admin
#   rhx aws.auth.root.env --admin <user>     # when >1 non-demo sso user
#
# guarantee:
#   - read-only against aws: sts, sso-admin list-instances,
#     identitystore list-users, organizations describe/list
#   - refuses unless the profile is the org's management account
#   - the demo email must agree between the demo sso user and the demo
#     org account, else it refuses (a plan would then move one of them)
#   - writes only with --mode apply; only into a gitignored path; never
#     overwrites a .env whose values differ (it shows the diff)
#   - exit 0 = done · 1 = malfunction · 2 = constraint
######################################################################

set -euo pipefail

DOTENV="provision/aws.auth/account=.root/.env"
DEMO_USERNAME="demo-agent"          # resources.demo.sso.ts userName
DEMO_ACCOUNT_NAME="ehmpathy-demo"   # resources.demo.account.ts name

show_help() {
  echo "🐢 here's the deal..."
  echo ""
  echo "🐚 aws.auth.root.env — fill the root .env from live aws, read-only"
  echo "   ├─ usage"
  echo "   │  └─ rhx aws.auth.root.env [--mode plan|apply] [--profile <p>] [--admin <user>]"
  echo "   ├─ options"
  echo "   │  ├─ --mode      plan (default) shows the values · apply writes $DOTENV"
  echo "   │  ├─ --profile   aws profile of the org management account (default: ehmpathy.root.admin)"
  echo "   │  ├─ --admin     admin sso username, when more than one non-demo user exists"
  echo "   │  └─ --help      show this help"
  echo "   └─ example"
  echo "      └─ rhx aws.auth.root.env --mode apply   # then: source $DOTENV"
  exit 0
}

# .what = fail loud unless a flag that takes a value got one
require_value() {
  local flag="" value="" pair
  for pair in "$@"; do
    case "$pair" in
      flag=*) flag="${pair#flag=}" ;;
      value=*) value="${pair#value=}" ;;
    esac
  done
  if [[ -z "$value" || "$value" == -* ]]; then
    echo "✋ ConstraintError: $flag requires a value" >&2
    echo "   └─ hint: rhx aws.auth.root.env --help" >&2
    exit 2
  fi
}

# .what = fail as a constraint, with a hint
fail_constraint() {
  local what="" hint="" pair
  for pair in "$@"; do
    case "$pair" in
      what=*) what="${pair#what=}" ;;
      hint=*) hint="${pair#hint=}" ;;
    esac
  done
  echo "✋ ConstraintError: $what" >&2
  echo "   └─ hint: $hint" >&2
  exit 2
}

# parse args; rhx passes its own flags through, which we drop
MODE="plan"
PROFILE="ehmpathy.root.admin"
ADMIN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help ;;
    --mode) require_value flag="$1" value="${2:-}"; MODE="$2"; shift 2 ;;
    --profile) require_value flag="$1" value="${2:-}"; PROFILE="$2"; shift 2 ;;
    --admin) require_value flag="$1" value="${2:-}"; ADMIN="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) fail_constraint what="unknown argument: $1" hint="rhx aws.auth.root.env --help" ;;
  esac
done
if [[ "$MODE" != "plan" && "$MODE" != "apply" ]]; then
  fail_constraint what="--mode must be plan or apply, got: $MODE" hint="rhx aws.auth.root.env --mode apply"
fi

# run from the repo root, so every path above resolves
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail_constraint what="not inside a git repo" hint="run from the declastruct-aws repo"
cd "$REPO_ROOT"

# read-only aws call on the chosen profile; a failure names the sign-in fix
awsRead() {
  local out
  out=$(aws "$@" --profile "$PROFILE" --output text 2>&1) || {
    echo "✋ ConstraintError: aws read failed on profile $PROFILE: aws $1 $2" >&2
    echo "   ├─ aws said: $(echo "$out" | tr '\n' ' ')" >&2
    echo "   └─ hint: sign in first: use.ehmpathy.root --owner admin" >&2
    exit 2
  }
  echo "$out"
}

# guard: the profile must be the org's management account
CALLER_ACCOUNT=$(awsRead sts get-caller-identity --query Account)
MGMT_ACCOUNT=$(awsRead organizations describe-organization --query Organization.MasterAccountId)
if [[ "$CALLER_ACCOUNT" != "$MGMT_ACCOUNT" ]]; then
  fail_constraint what="profile $PROFILE is not the org management account" hint="pass --profile for the root account (use.ehmpathy.root --owner admin)"
fi

# read the sso users
STORE_ID=$(awsRead sso-admin list-instances --query 'Instances[0].IdentityStoreId')
USERS=$(awsRead identitystore list-users --identity-store-id "$STORE_ID" --query 'Users[].[UserName,Emails[0].Value]')

# demo email, from the demo sso user
DEMO_SSO_EMAIL=$(echo "$USERS" | awk -v u="$DEMO_USERNAME" '$1 == u { print $2 }')
if [[ -z "$DEMO_SSO_EMAIL" ]]; then
  fail_constraint what="no sso user named $DEMO_USERNAME" hint="apply account=.root by hand once (readme.md), then rerun"
fi

# demo email, from the demo org account; both must agree
DEMO_ACCOUNT_EMAIL=$(awsRead organizations list-accounts --query "Accounts[?Name=='$DEMO_ACCOUNT_NAME'].Email | [0]")
if [[ "$DEMO_ACCOUNT_EMAIL" != "$DEMO_SSO_EMAIL" ]]; then
  echo "✋ ConstraintError: the demo email differs between sso user and org account" >&2
  echo "   ├─ sso user $DEMO_USERNAME: $DEMO_SSO_EMAIL" >&2
  echo "   ├─ org account $DEMO_ACCOUNT_NAME: $DEMO_ACCOUNT_EMAIL" >&2
  echo "   └─ hint: resources.ts sets both from one SSO_DEMO_EMAIL; decide which is right before any plan" >&2
  exit 2
fi

# admin user: the one non-demo user, or --admin
OTHERS=$(echo "$USERS" | awk -v u="$DEMO_USERNAME" '$1 != u { print $1 }')
if [[ -z "$ADMIN" ]]; then
  if [[ $(echo "$OTHERS" | grep -c .) -ne 1 ]]; then
    echo "✋ ConstraintError: cannot tell which sso user is the admin" >&2
    echo "   ├─ candidates: $(echo "$OTHERS" | paste -sd ' ')" >&2
    echo "   └─ hint: rhx aws.auth.root.env --admin <username>" >&2
    exit 2
  fi
  ADMIN="$OTHERS"
fi
ADMIN_EMAIL=$(echo "$USERS" | awk -v u="$ADMIN" '$1 == u { print $2 }')
if [[ -z "$ADMIN_EMAIL" ]]; then
  fail_constraint what="no sso user named $ADMIN" hint="rhx aws.auth.root.env --admin <username>"
fi

# the .env body
BODY="# root plan values, read from live aws by rhx aws.auth.root.env — gitignored
export SSO_ADMIN_USERNAME=$ADMIN
export SSO_ADMIN_EMAIL=$ADMIN_EMAIL
export SSO_DEMO_EMAIL=$DEMO_SSO_EMAIL"

echo "🐢 read from live aws"
echo ""
echo "🐚 aws.auth.root.env --mode $MODE"
echo "   ├─ profile: $PROFILE (org management account)"
echo "   ├─ SSO_ADMIN_USERNAME=$ADMIN"
echo "   ├─ SSO_ADMIN_EMAIL=$ADMIN_EMAIL"
echo "   ├─ SSO_DEMO_EMAIL=$DEMO_SSO_EMAIL (sso user + org account agree)"

# plan: stop here
if [[ "$MODE" == "plan" ]]; then
  echo "   └─ plan only; to write it: rhx aws.auth.root.env --mode apply"
  exit 0
fi

# apply: only into a gitignored path
if ! git check-ignore -q "$DOTENV"; then
  fail_constraint what="$DOTENV is not gitignored; refuse to write it" hint="add .env to .gitignore first"
fi

# apply: never overwrite a .env with other values
if [[ -f "$DOTENV" ]]; then
  if [[ "$(grep '^export ' "$DOTENV" | sort)" == "$(echo "$BODY" | grep '^export ' | sort)" ]]; then
    echo "   └─ ✓ $DOTENV already holds these values"
    exit 0
  fi
  echo "✋ ConstraintError: $DOTENV exists with other values; not overwritten" >&2
  echo "   ├─ found:" >&2
  grep '^export ' "$DOTENV" | sed 's/^/   │  /' >&2
  echo "   └─ hint: delete it to take the live values, then rerun with --mode apply" >&2
  exit 2
fi

printf '%s\n' "$BODY" > "$DOTENV"
echo "   └─ ✓ wrote $DOTENV; next: source $DOTENV"
