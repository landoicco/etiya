#!/usr/bin/env bash
# Builds the web app and uploads it to the bucket of a deployed stack.
# Usage, from web/: npm run deploy          (stack EtiyaProd)
#                   STACK=EtiyaDev npm run deploy   (only if dev was given a Web construct)
# Needs AWS credentials (aws login) and a stack already deployed with cdk deploy
set -euo pipefail
cd "$(dirname "$0")/.."

# Only what main holds reaches the bucket. The build copies public/ whole, ignored files too
fail() { echo "Not deploying: $1" >&2; exit 1; }
git fetch --quiet origin main
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || fail "check out main first"
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "main has uncommitted changes"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main differs from origin/main"
extra="$(git ls-files --others public | grep -vx public/config.json || true)"
[ -z "$extra" ] || fail "public/ holds files git does not track:"$'\n'"$extra"

# Read before building, so a missing stack fails fast
bucket="$(scripts/stack-output.sh WebBucketName)"

npm run build

# Written after the build, so the same build works for any stack.
# CloudFront serves it with no-cache, like index.html
scripts/config.sh dist/config.json

# Hashed files first, so a phone that fetches the new index.html mid-upload finds everything
# it points to. No --delete: old hashed files stay for phones still running the previous build
aws s3 sync dist/assets "s3://$bucket/assets"
aws s3 sync dist "s3://$bucket"

echo "Deployed to $(scripts/stack-output.sh WebUrl)"
