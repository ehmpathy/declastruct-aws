#!/usr/bin/env bash
######################################################################
# .what = plan provision/aws.auth/account=demo, read-only, never apply
#
# .why  = the plan read is the gate before every demo auth apply
#         (readme.md "what to check in the plan"). this runs it with
#         no hand-assembled shell: creds from keyrack, the reach's
#         caller identity from .env or, absent that, off the live role
#
# usage:
#   rhx aws.auth.demo.plan
#
# guarantee:
#   - never applies: it runs `declastruct plan` only, into its own
#     provision/aws.auth/account=demo/.temp/plan.readonly.json, a path
#     the runbook's apply never reads
#   - creds always come from keyrack env `test` (the demo account);
#     an ambient AWS_PROFILE is never trusted
#   - from .env it imports the reach pair alone; no other assignment
#     in .env reaches this skill or the plan
#   - the reach pair comes from .env, else the shell, else the live
#     role's trust principal (readme.reach.md fallback). half a pair
#     fails loud, and names the source that held the half
#   - ⚠️ a principal read off the live role cannot diff against itself,
#     so that plan cannot catch a wrong .env pair; it says so on screen,
#     at the top and at the close
#   - closes with a tally of the plan: rows per decision, the name of
#     each row that is not KEEP, and the changed lines of each UPDATE,
#     so the read shows WHICH field moved; a warn if more than one moved
#   - exit 0 = plan written · 1 = malfunction · 2 = constraint
######################################################################

set -euo pipefail

# the demo account's creds live at keyrack env `test`; the wish below is
# demo-only, so no other env is legal here
KEYRACK_ENV="test"
WISH="provision/aws.auth/account=demo/resources.ts"
INTO="provision/aws.auth/account=demo/.temp/plan.readonly.json"
DOTENV="provision/aws.auth/account=demo/.env"
REACH_ROLE="ehmpathy-demo-for-grove"

# a role arn, by the iam role-name charset, with an optional path (svc/name)
ROLE_ARN_PATTERN='^arn:aws:iam::[0-9]{12}:role/([A-Za-z0-9+=,.@_-]+/)*[A-Za-z0-9+=,.@_-]{1,64}$'

show_help() {
  echo "🐢 here's the deal..."
  echo ""
  echo "🐚 aws.auth.demo.plan — plan the demo auth resources, read-only"
  echo "   ├─ usage"
  echo "   │  └─ rhx aws.auth.demo.plan"
  echo "   ├─ inputs, none passed by hand"
  echo "   │  ├─ creds: keyrack env $KEYRACK_ENV, unlocked for you"
  echo "   │  └─ reach pair: GROVE_REACH_CAMP_ACCOUNT_ID + GROVE_REACH_CAMP_ROLE_NAME"
  echo "   │     └─ read from: $DOTENV, else the shell, else the live role"
  echo "   ├─ options"
  echo "   │  └─ --help   show this help"
  echo "   ├─ example"
  echo "   │  └─ rhx aws.auth.demo.plan   # then read the tally: one UPDATE per intended change"
  echo "   └─ never applies; writes $INTO"
  exit 0
}

# .what = fail loud unless a flag that takes a value got one
# .why  = under set -u a bare "$2" aborts with bash's own unbound-variable
#         text and exit 1, and `--repo --help` would take `--help` as the
#         value; the caller deserves the flag name and exit 2, at the parse
# .how  = require_value flag="$1" value="${2:-}"
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
    echo "   └─ hint: rhx aws.auth.demo.plan --help" >&2
    exit 2
  fi
}

# .what = is this a role arn? one principal, no list, no unique id
isRoleArn() { [[ "$1" =~ $ROLE_ARN_PATTERN ]]; }

# .what = the account id of a role arn
asAccountIdFromRoleArn() { local rest="${1#arn:aws:iam::}"; echo "${rest%%:*}"; }

# .what = the role name of a role arn, with its path if any (svc/name)
asRoleNameFromRoleArn() { echo "${1#*:role/}"; }

# .what = the value one key holds in .env, read in a subshell
# .why  = the subshell keeps every other .env assignment (AWS_*, or a name
#         this skill uses) out of the skill; the unset ensures a shell value
#         never reads as the .env's
# .how  = asDotenvValue key=GROVE_REACH_CAMP_ACCOUNT_ID
asDotenvValue() {
  local key="${1#key=}"
  (
    unset GROVE_REACH_CAMP_ACCOUNT_ID GROVE_REACH_CAMP_ROLE_NAME
    set +u
    # shellcheck disable=SC1090
    source "$DOTENV"
    printf '%s' "${!key:-}"
  )
}

# .what = print the plan's tally as a tree: rows per decision, and the
#         name of each row that is not KEEP
# .why  = the plan file runs to ~1,500 lines; the gate (one trust-action
#         UPDATE, all else KEEP) must read at a glance
showPlanTally() {
  node -e '
    const asPlan = (text) => {
      try { return JSON.parse(text); } catch { return null; }
    };
    const plan = asPlan(require("fs").readFileSync(process.argv[1]).toString());
    const isPlanShape = (value) =>
      Array.isArray(value?.changes) &&
      value.changes.every((change) => typeof change?.forResource?.slug === "string");
    if (!isPlanShape(plan)) process.exit(3);

    // the changed lines of an UPDATE diff, so the gate reads WHICH field
    // moved (an action, or a principal from a wrong .env), not only that a
    // row did. the "- Remote" / "+ Desired" legend is dropped; the indent
    // past the shallowest line is kept, so array items sit under their key
    const asChangedLines = (difference) => {
      const lines = (difference ?? "")
        .split("\n")
        .filter((line) => /^[-+] /.test(line) && !/^[-+] (Remote|Desired)$/.test(line));
      const indents = lines.map((line) => line.slice(1).match(/^ */)[0].length);
      const indentMin = Math.min(...indents);
      return lines.map((line) => `${line[0]} ${line.slice(1 + indentMin)}`);
    };

    // the slug without its hash suffix, which names naught a reader needs
    const asSlugReadable = (slug) => slug.replace(/\.[0-9a-f]{32}$/, "");

    const byAction = {};
    plan.changes.forEach((change) => {
      byAction[change.action] = [...(byAction[change.action] ?? []), change];
    });
    const actions = Object.keys(byAction).sort();
    console.log("🐚 plan tally");
    if (actions.length === 0) console.log("   └─ no changes in the plan");
    actions.forEach((action, index) => {
      const last = index === actions.length - 1;
      const changes = byAction[action];
      console.log(`   ${last ? "└─" : "├─"} ${action}: ${changes.length}`);
      if (action === "KEEP") return;
      changes.forEach((change, changeIndex) => {
        const changeLast = changeIndex === changes.length - 1;
        const trunk = `   ${last ? "  " : "│ "} `;
        console.log(`${trunk}${changeLast ? "└─" : "├─"} ${asSlugReadable(change.forResource.slug)}`);
        if (action !== "UPDATE") return;
        const lines = asChangedLines(change.state?.difference);
        lines.forEach((line, lineIndex) => {
          const lineLast = lineIndex === lines.length - 1;
          console.log(`${trunk}${changeLast ? "  " : "│ "} ${lineLast ? "└─" : "├─"} ${line}`);
        });
      });
    });
  ' "$INTO"
}

# .what = how many rows of the plan are not KEEP
# .why  = the close warns when more than one row moves; the runbook gate is
#         one UPDATE per intended change
getPlanMovedCount() {
  node -e '
    const plan = JSON.parse(require("fs").readFileSync(process.argv[1]).toString());
    console.log(plan.changes.filter((change) => change.action !== "KEEP").length);
  ' "$INTO"
}

# .what = does any UPDATE in the plan move a trust principal?
# .why  = a wrong .env pair plans as ONE UPDATE, the same count as the gate;
#         only its principal line tells it apart, so the close names it
isPlanPrincipalMoved() {
  node -e '
    const plan = JSON.parse(require("fs").readFileSync(process.argv[1]).toString());
    const moved = plan.changes.some(
      (change) =>
        change.action === "UPDATE" &&
        (change.state?.difference ?? "").split("\n").some((line) => /^[-+]\s+"aws":/.test(line)),
    );
    process.exit(moved ? 0 : 1);
  ' "$INTO"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    help|--help|-h) show_help ;;
    --skill|--repo|--role) require_value flag="$1" value="${2:-}"; shift 2 ;; # rhx passthrough
    *) echo "✋ ConstraintError: unknown arg '$1'" >&2; echo "   └─ hint: rhx aws.auth.demo.plan --help" >&2; exit 2 ;;
  esac
done

# run from the repo root, so the wish, plan, and .env paths hold from any subdir
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "✋ ConstraintError: not inside a git repo" >&2
  echo "   └─ hint: run from within the declastruct-aws clone" >&2
  exit 2
}
cd "$ROOT"

# unlock the keyrack vault + source the demo aws profile, always. an
# ambient AWS_PROFILE is never trusted: it may name another account, and a
# plan against the wrong account reads as a wall of CREATE rows
UNLOCK_OUT=$(rhx keyrack unlock --owner ehmpath --env "$KEYRACK_ENV" 2>&1) || {
  echo "$UNLOCK_OUT" >&2
  echo "✋ ConstraintError: keyrack unlock failed for env=$KEYRACK_ENV" >&2
  echo "   └─ hint: read keyrack's reason above, then rhx keyrack unlock --owner ehmpath --env $KEYRACK_ENV" >&2
  exit 2
}
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_PROFILE
eval "$(rhx keyrack source --key AWS_PROFILE --env "$KEYRACK_ENV" --owner ehmpath --lenient)"
if [[ -z "${AWS_PROFILE:-}" ]]; then
  echo "✋ ConstraintError: no AWS_PROFILE from keyrack for env=$KEYRACK_ENV" >&2
  echo "   └─ hint: rhx keyrack unlock --owner ehmpath --env $KEYRACK_ENV" >&2
  exit 2
fi
export AWS_PROFILE
export AWS_REGION="${AWS_REGION:-us-east-1}"

# prove the creds work before any read leans on them
CALLER=$(aws sts get-caller-identity --query Arn --output text) || {
  echo "✋ ConstraintError: aws creds for env=$KEYRACK_ENV do not authenticate" >&2
  echo "   └─ hint: rhx keyrack unlock --owner ehmpath --env $KEYRACK_ENV" >&2
  exit 2
}

# supply the reach's caller identity: .env, else the shell, else the live
# role. the label names where the pair was found, never mere file presence
SOURCE="live role $REACH_ROLE"
PAIR_ACCOUNT=""
PAIR_ROLE=""
if [[ -f "$DOTENV" ]]; then
  PAIR_ACCOUNT=$(asDotenvValue key=GROVE_REACH_CAMP_ACCOUNT_ID)
  PAIR_ROLE=$(asDotenvValue key=GROVE_REACH_CAMP_ROLE_NAME)
  [[ -n "$PAIR_ACCOUNT$PAIR_ROLE" ]] && SOURCE=".env"
fi
if [[ "$SOURCE" != ".env" && -n "${GROVE_REACH_CAMP_ACCOUNT_ID:-}${GROVE_REACH_CAMP_ROLE_NAME:-}" ]]; then
  SOURCE="shell"
  PAIR_ACCOUNT="${GROVE_REACH_CAMP_ACCOUNT_ID:-}"
  PAIR_ROLE="${GROVE_REACH_CAMP_ROLE_NAME:-}"
fi

# reject half a pair: a silent fall-through to the live role would hide it
if [[ "$SOURCE" != "live role $REACH_ROLE" && ( -z "$PAIR_ACCOUNT" || -z "$PAIR_ROLE" ) ]]; then
  PAIR_ABSENT="GROVE_REACH_CAMP_ACCOUNT_ID"
  [[ -n "$PAIR_ACCOUNT" ]] && PAIR_ABSENT="GROVE_REACH_CAMP_ROLE_NAME"
  echo "✋ ConstraintError: the $SOURCE sets only one of GROVE_REACH_CAMP_ACCOUNT_ID, GROVE_REACH_CAMP_ROLE_NAME" >&2
  echo "   ├─ absent: $PAIR_ABSENT" >&2
  echo "   └─ hint: set both (see $DOTENV.example), or neither to read them off the live role" >&2
  exit 2
fi

if [[ "$SOURCE" == "live role $REACH_ROLE" ]]; then
  # twins of this read-back: CAMP_REACH_ENV_HINT in resources.reach.ts and
  # the fallback block in readme.reach.md; keep the token set in step
  GETROLE_OUT=$(aws iam get-role --role-name "$REACH_ROLE" \
    --query 'Role.AssumeRolePolicyDocument.Statement[0].Principal.AWS' --output text 2>&1) || {
    # a role not yet created is the caller's to fix: supply the pair via .env
    if [[ "$GETROLE_OUT" == *NoSuchEntity* ]]; then
      echo "✋ ConstraintError: $REACH_ROLE does not exist yet, so its trust principal cannot be read" >&2
      echo "   └─ hint: fill $DOTENV (see $DOTENV.example) and rerun" >&2
      exit 2
    fi
    echo "$GETROLE_OUT" >&2
    echo "💥 MalfunctionError: could not read $REACH_ROLE's trust principal" >&2
    echo "   └─ hint: read aws's reason above; or fill $DOTENV (see $DOTENV.example) and rerun" >&2
    exit 1
  }
  # reject a principal that is not one role arn. iam shows a bare unique id
  # (AROA…) once the principal's role is deleted, and a tab-joined list for
  # a hand-edited multi-principal trust; no pair parses from either
  if ! isRoleArn "$GETROLE_OUT"; then
    echo "✋ ConstraintError: $REACH_ROLE's trust principal is not one role arn" >&2
    # a tab shows as \t, so a tab-joined list never reads as one arn
    echo "   ├─ got: ${GETROLE_OUT//$'\t'/\\t}" >&2
    echo "   └─ hint: fill $DOTENV (see $DOTENV.example) and rerun" >&2
    exit 2
  fi
  PAIR_ACCOUNT=$(asAccountIdFromRoleArn "$GETROLE_OUT")
  PAIR_ROLE=$(asRoleNameFromRoleArn "$GETROLE_OUT")
fi
export GROVE_REACH_CAMP_ACCOUNT_ID="$PAIR_ACCOUNT"
export GROVE_REACH_CAMP_ROLE_NAME="$PAIR_ROLE"

echo "🐢 reef check..."
echo ""
echo "🐚 aws.auth.demo.plan"
echo "   ├─ caller: $CALLER"
echo "   ├─ reach identity from: $SOURCE"
if [[ "$SOURCE" == "live role $REACH_ROLE" ]]; then
  echo "   │  └─ ⚠️ principal NOT checked: read off the live role, so it cannot differ from it"
fi
echo "   └─ plan into: $INTO"
echo ""

# plan, never apply
npx declastruct plan --wish "$WISH" --into "$INTO" || {
  echo "💥 MalfunctionError: declastruct plan failed" >&2
  echo "   └─ hint: read its reason above; a placeholder or malformed $DOTENV is the likeliest cause" >&2
  exit 1
}

echo ""
showPlanTally || {
  echo "💥 MalfunctionError: could not tally the plan at $INTO" >&2
  echo "   ├─ reason: not a declastruct plan (no changes list, or a row with no resource slug)" >&2
  echo "   └─ hint: rerun; a plan cut short (ctrl-c, full disk) leaves a partial file" >&2
  exit 1
}
MOVED=$(getPlanMovedCount)
echo ""
echo "🐢 plan written. read it before any apply; this skill never applies"
echo ""
echo "🐚 before any apply"
if [[ "$MOVED" -gt 1 ]]; then
  echo "   ├─ ⚠️ $MOVED rows are not KEEP; confirm each is an intended change, else STOP"
fi
if isPlanPrincipalMoved; then
  echo "   ├─ ⚠️ a trust principal moves; a wrong .env pair is the likeliest cause, so STOP and check it"
fi
if [[ "$SOURCE" == "live role $REACH_ROLE" ]]; then
  echo "   ├─ ⚠️ principal NOT checked; the applier's own plan, from the applier's .env, owns that check"
fi
echo "   └─ to apply: the applier's own shell, per account=demo/readme.md (admin creds + .env, plan, apply)"
