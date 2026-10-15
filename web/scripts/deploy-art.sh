#!/usr/bin/env bash
# Uploads the exercise pictures, which are not in the repo, to the bucket of a deployed stack.
# Usage, from web/: ART_DIR=<folder holding exercises/> npm run deploy:art   (stack EtiyaProd)
# exercises/ holds <id>.svg files and index.json, an object of id → description
set -euo pipefail
cd "$(dirname "$0")/.."

src="${ART_DIR:?set ART_DIR to the folder that holds exercises/}/exercises"
if ! node -e 'try { const i = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (typeof i !== "object" || i === null || Array.isArray(i)) process.exit(1) } catch { process.exit(1) }' \
  "$src/index.json"; then
  echo "$src/index.json is missing or not an object of id → description" >&2
  exit 1
fi

bucket="$(scripts/stack-output.sh WebBucketName)"

# Pictures first and the index last, so the index never names a picture not uploaded yet.
# No --delete: the bucket is versioned, but a picture nobody asks for costs nothing
aws s3 sync "$src" "s3://$bucket/art/exercises" --exclude "*" --include "*.svg"
aws s3 cp "$src/index.json" "s3://$bucket/art/exercises/index.json"

echo "Art uploaded: $(node -e 'console.log(Object.keys(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))).length)' "$src/index.json") exercises"
