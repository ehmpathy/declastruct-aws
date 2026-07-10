#!/usr/bin/env bash
######################################################################
# .what = prune stale EC2 orphans (instance + launch template) from demo
#
# .why  = instances and templates are immutable; when a declared attribute
#         changes, the extant orphan blocks apply (upsert not supported) and
#         blocks the acceptance suite. this unlocks keyrack, sources the demo
#         profile, and runs aws.prune.ec2.ts to delete the orphan pair so a
#         fresh apply can recreate it clean.
#
# usage:
#   # demo infra defaults
#   ./provision/aws.infra/account=demo/aws.prune.ec2.sh
#
#   # explicit target exids (e.g. stale acceptance fixtures)
#   ./provision/aws.infra/account=demo/aws.prune.ec2.sh \
#     --instance declastruct-acceptance-instance \
#     --template declastruct-acceptance-template
#
# guarantee:
#   - unlocks keyrack for ehmpath/test (provides AWS_PROFILE)
#   - aws.prune.ec2.ts self-sources the profile via keyrack.source
#   - del ops are idempotent — safe to re-run, no-op if already absent
#   - fail-fast on any error
######################################################################
set -euo pipefail

# resolve this script's directory so it runs from any cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# unlock keyrack so the demo profile credentials are available
echo "🔓 unlock keyrack (ehmpath/test)..."
rhx keyrack unlock --owner ehmpath --env test

# run the prune, forward any --instance / --template overrides
echo "🌿 prune ec2 orphans..."
npx tsx "$SCRIPT_DIR/aws.prune.ec2.ts" "$@"
