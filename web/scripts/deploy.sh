#!/usr/bin/env bash
# Builds the web app and uploads it to the bucket of a deployed stack.
# Usage, from web/: npm run deploy          (stack EtiyaDev)
#                   STACK=Other npm run deploy
# Needs AWS credentials (aws login) and a stack already deployed with cdk deploy
set -euo pipefail

STACK="${STACK:-EtiyaDev}"
cd "$(dirname "$0")/.."

# Reads one output of the stack, the same ones cdk deploy prints
output() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

bucket="$(output WebBucketName)"
# The CLI prints "None" for an output the stack does not have yet
if [[ -z "$bucket" || "$bucket" == "None" ]]; then
  echo "Stack $STACK has no WebBucketName output; run cdk deploy first" >&2
  exit 1
fi
api_url="$(output ApiUrl)"
user_pool_id="$(output UserPoolId)"
user_pool_client_id="$(output UserPoolClientId)"

npm run build

# Written after the build, so the same build works for any stack and none of these values
# is ever committed. CloudFront serves it with no-cache, like index.html
cat > dist/config.json <<EOF
{
  "apiUrl": "$api_url",
  "userPoolId": "$user_pool_id",
  "userPoolClientId": "$user_pool_client_id"
}
EOF

# Hashed files first, so a phone that fetches the new index.html mid-upload finds everything
# it points to. No --delete: old hashed files stay for phones still running the previous build
aws s3 sync dist/assets "s3://$bucket/assets"
aws s3 sync dist "s3://$bucket"

echo "Deployed to $(output WebUrl)"
