#!/usr/bin/env bash
# Writes the config.json the app reads at startup, with the values of a deployed stack.
# Usage, from web/: npm run config    (writes public/config.json, which npm run dev serves)
# deploy.sh calls it too, for the build. STACK defaults to EtiyaDev
set -euo pipefail
cd "$(dirname "$0")/.."

target="$1"

api_url="$(scripts/stack-output.sh ApiUrl)"
user_pool_id="$(scripts/stack-output.sh UserPoolId)"
user_pool_client_id="$(scripts/stack-output.sh UserPoolClientId)"

# Never committed: these values belong to whoever deployed the stack
cat > "$target" <<EOF
{
  "apiUrl": "$api_url",
  "userPoolId": "$user_pool_id",
  "userPoolClientId": "$user_pool_client_id"
}
EOF

echo "Wrote $target"
