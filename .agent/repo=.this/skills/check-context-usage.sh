#!/bin/bash

# This script provides a ROUGH APPROXIMATION of context usage
# by analyzing the transcript file. This is NOT the same as Claude's
# actual internal context tracking, which includes:
# - Prompt caching (cached content doesn't count toward limit)
# - Compaction (removes old content)
# - System prompts and tool definitions
#
# Use this as a heuristic only. For accurate usage, use /usage in Claude.

PROJECT_DIR=$(pwd | sed 's/\//-/g' | sed 's/^-//')
TRANSCRIPT=$(ls -t ~/.claude/projects/-${PROJECT_DIR}/*.jsonl 2>/dev/null | grep -v "agent-" | head -1)

if [ -z "$TRANSCRIPT" ]; then
  echo "No transcript found for project: $PROJECT_DIR"
  exit 1
fi

# Get the last message with usage data
LAST_USAGE=$(jq -r 'select(.message.usage != null) | .message.usage | (.input_tokens // 0)' "$TRANSCRIPT" | tail -1)

# Claude Sonnet 4.5 has a 200k token context window
CONTEXT_LIMIT=200000

# The last input_tokens value represents the TOTAL context sent to Claude
# on the most recent turn (this is the best approximation we have)
ESTIMATED_CONTEXT=$LAST_USAGE

# Calculate percentage
PERCENTAGE=$(echo "scale=2; ($ESTIMATED_CONTEXT / $CONTEXT_LIMIT) * 100" | bc)

echo "Estimated Context Usage: ~${ESTIMATED_CONTEXT} / ${CONTEXT_LIMIT} tokens (~${PERCENTAGE}%)"
echo "(This is an approximation based on transcript analysis)"

# Exit with code 0 if under 70%, code 1 if over
if (( $(echo "$PERCENTAGE >= 70" | bc -l) )); then
  echo "WARNING: Estimated context usage is at or above 70%"
  exit 1
else
  echo "Estimated context usage is below 70%"
  exit 0
fi
