#!/usr/bin/env bash
# Prints one output of a deployed stack, the same ones cdk deploy prints.
# Usage: scripts/stack-output.sh <OutputKey>    (STACK defaults to EtiyaDev)
set -euo pipefail

STACK="${STACK:-EtiyaDev}"

value="$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text)"

# The CLI prints "None" for an output the stack does not have yet
if [[ -z "$value" || "$value" == "None" ]]; then
  echo "Stack $STACK has no $1 output; run cdk deploy first" >&2
  exit 1
fi

echo "$value"
