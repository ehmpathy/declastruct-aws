#!/usr/bin/env bash
######################################################################
# .what = prune stale VPC orphans (subnet + route table) from demo
#
# .why  = a subnet's natural key (vpc, cidr) is a SUBSET of its identity, so a
#         renamed-fixture orphan still holds the cidr the new subnet wants. the
#         ownership gate now fails loud on that foreign-exid orphan instead of a
#         silent steal (rule.forbid.silent-resource-theft), so the orphan must be
#         pruned first. this unlocks keyrack, sources the demo profile, and runs
#         aws.prune.vpc.ts to delete the old route table + subnet so a fresh apply
#         recreates the renamed subnet clean.
#
# usage:
#   # defaults: the stale acceptance orphans from the pre-#59 single-subnet shape
#   ./provision/aws.infra/account=demo/aws.prune.vpc.sh
#
#   # explicit target exids
#   ./provision/aws.infra/account=demo/aws.prune.vpc.sh \
#     --subnet declastruct-acceptance-subnet-1a \
#     --route-table declastruct-acceptance-rtb
#
# guarantee:
#   - unlocks keyrack for ehmpath/test (provides AWS_PROFILE)
#   - aws.prune.vpc.ts self-sources the profile via keyrack.source
#   - del ops are idempotent — safe to re-run, no-op if already absent
#   - fail-fast on any error
######################################################################
set -euo pipefail

# derive this file's directory so it runs from any cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# unlock keyrack so the demo profile credentials are available
echo "🔓 unlock keyrack (ehmpath/test)..."
rhx keyrack unlock --owner ehmpath --env test

# run the prune, forward any --subnet / --route-table overrides
echo "🌿 prune vpc orphans..."
npx tsx "$SCRIPT_DIR/aws.prune.vpc.ts" "$@"
