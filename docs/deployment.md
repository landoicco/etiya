# Deployment (AWS CDK)

*For deploying your own copy to an AWS account, and for understanding what it costs.*

`infra/` is an independent Maven project that defines the infrastructure with the **AWS CDK in Java**:

| Construct | Resources |
|---|---|
| `Database` | DynamoDB table `EtiyaDev-Workouts`, provisioned 5 RCU / 5 WCU |
| `Auth` | Cognito user pool with self sign-up disabled, plus a public app client |
| `Functions` | Three Lambdas (one per domain) with SnapStart, each exposed through a `live` alias |
| `Api` | HTTP API with a Cognito JWT authorizer on every route, CORS and throttling |

One stack per environment. Today there is only `EtiyaDev`; the name leaves room for `EtiyaProd` later.

## Prerequisites

**AWS credentials.** Either sign in with the console session (temporary credentials, no long-lived keys):
```bash
aws login
aws sts get-caller-identity
```
…or configure an IAM user's access keys with `aws configure --profile etiya` and `export AWS_PROFILE=etiya`.

**Bootstrap**, once per account and region:
```bash
cd infra && cdk bootstrap
```

> On nixpkgs, `aws-cdk-cli` 2.1131.0 does not ship `bootstrap-template.yaml` where the CLI looks for it, so `cdk bootstrap` fails with `ENOENT`. Workaround: point it at the copy that is shipped:
> ```bash
> cdk bootstrap --template "$(dirname "$(readlink -f "$(which cdk)")")/../lib/api/bootstrap/bootstrap-template.yaml"
> ```
> This only affects `bootstrap`, not `synth` or `deploy`.

## Deploying

The Lambda jar is built first, since the CDK packages it as an asset:
```bash
cd core && mvn -P prod clean package -DskipTests
cd ../infra && cdk deploy
```

`cdk synth` needs no credentials and touches nothing in AWS, so it is a safe way to check the stack before deploying.

The deploy prints everything needed to use the API:
```
ApiUrl           = https://<api-id>.execute-api.us-east-1.amazonaws.com
UserPoolId       = us-east-1_xxxxxxxxx
UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
TableName        = EtiyaDev-Workouts
```

The first deploy takes a few minutes: it uploads the jar and publishes the SnapStart snapshots.

## Creating the first user

Users cannot sign themselves up, so an administrator creates them:
```bash
aws cognito-idp admin-create-user --user-pool-id <POOL_ID> \
  --username you@example.com --message-action SUPPRESS

aws cognito-idp admin-set-user-password --user-pool-id <POOL_ID> \
  --username you@example.com --password '<PASSWORD>' --permanent
```

* `--message-action SUPPRESS` skips the invitation email. The address is never contacted, so it does not need to be real.
* `--permanent` matters: without it the user stays in `FORCE_CHANGE_PASSWORD` and login returns a challenge instead of tokens.

The `sub` claim of that user is the ID the API stores as the owner of their workouts:
```bash
aws cognito-idp admin-get-user --user-pool-id <POOL_ID> --username you@example.com \
  --query 'UserAttributes[?Name==`sub`].Value' --output text
```

## Tearing it down

```bash
cd infra && cdk destroy
```
The table and the user pool use `RemovalPolicy.DESTROY`, so nothing is left behind. That is deliberate for a dev environment and would have to change for production.

## Cost

Everything here fits the AWS free tier, with two exceptions worth knowing about:

| Service | Situation |
|---|---|
| Lambda | 1M requests and 400k GB-s per month, always free. **SnapStart costs nothing extra for Java** |
| DynamoDB | The always-free 25 RCU / 25 WCU apply to *provisioned* capacity, which is why the table is provisioned rather than on-demand |
| Cognito | Free monthly active users far above what this project needs |
| CloudWatch Logs | 5 GB per month; log groups are set to a 14 day retention, since the default is to keep them forever |
| HTTP API | ⚠️ ~$1 per million requests. Its free tier only lasts 12 months |
| S3 (CDK assets) | ⚠️ Each deploy uploads the ~52 MB jar. Cents per month, but old assets accumulate |

Deliberately avoided: NAT gateways, customer-managed KMS keys, Secrets Manager and WAF.

## Abuse and limits

* Every route requires a valid Cognito token, and API Gateway answers `401` **before invoking any Lambda**, so unauthorized traffic costs no Lambda time.
* Self sign-up is disabled, so knowing the URL is not enough to get an account.
* The default stage throttles at 10 requests per second with a burst of 20.
* **Honest limitation:** API Gateway bills for every request it receives, including the ones it rejects. A sustained flood at the throttle limit would cost real money, so the API URL is not published in this repo and a budget alarm is the safety net.
* Still open: reserved concurrency per Lambda and a lower throttle. See [decisions](decisions.md#still-open).
