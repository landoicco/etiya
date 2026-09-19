package licaza.etiya.infra;

import java.util.List;
import java.util.Map;
import software.amazon.awscdk.Acknowledgment;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Validations;
import software.amazon.awscdk.services.cloudfront.BehaviorOptions;
import software.amazon.awscdk.services.cloudfront.CachePolicy;
import software.amazon.awscdk.services.cloudfront.Distribution;
import software.amazon.awscdk.services.cloudfront.ErrorResponse;
import software.amazon.awscdk.services.cloudfront.HeadersFrameOption;
import software.amazon.awscdk.services.cloudfront.HeadersReferrerPolicy;
import software.amazon.awscdk.services.cloudfront.ICachePolicy;
import software.amazon.awscdk.services.cloudfront.IOrigin;
import software.amazon.awscdk.services.cloudfront.PriceClass;
import software.amazon.awscdk.services.cloudfront.ResponseCustomHeader;
import software.amazon.awscdk.services.cloudfront.ResponseCustomHeadersBehavior;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersContentTypeOptions;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersFrameOptions;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersReferrerPolicy;
import software.amazon.awscdk.services.cloudfront.ResponseHeadersStrictTransportSecurity;
import software.amazon.awscdk.services.cloudfront.ResponseSecurityHeadersBehavior;
import software.amazon.awscdk.services.cloudfront.ViewerProtocolPolicy;
import software.amazon.awscdk.services.cloudfront.origins.S3BucketOrigin;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.constructs.Construct;

// The PWA: a private bucket that only CloudFront can read, served on the default
// cloudfront.net domain, which already has the HTTPS that service workers require.
// The files are not part of the stack: web/scripts/deploy.sh builds and uploads them
public class Web extends Construct {

  // Vite puts a content hash in every file name under assets/, so a new build never reuses a
  // name and those files can be cached forever. Everything else keeps its name between builds
  private static final String HASHED_ASSETS = "/assets/*";
  private static final String CACHE_FOREVER = "public, max-age=31536000, immutable";
  // index.html, sw.js, the manifest and config.json: the browser must always ask for the latest,
  // or a new deploy would not reach the phones until their cache expired
  private static final String NEVER_CACHE = "no-cache";

  private final Bucket bucket;
  private final Distribution distribution;

  public Web(final Construct scope, final String id) {
    super(scope, id);

    this.bucket =
        Bucket.Builder.create(this, "Bucket")
            .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
            .encryption(BucketEncryption.S3_MANAGED)
            .enforceSsl(true)
            // Dev environment: cdk destroy must not leave the bucket behind. CloudFormation only
            // deletes empty buckets, so it is emptied by hand first (see docs/deployment.md);
            // autoDeleteObjects would do it with one more Lambda to maintain
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();

    // Origin Access Control: CloudFront signs its requests and the bucket policy only accepts
    // those, so the bucket stays private
    IOrigin origin = S3BucketOrigin.withOriginAccessControl(bucket);

    this.distribution =
        Distribution.Builder.create(this, "Distribution")
            .comment("Etiya web app")
            .defaultRootObject("index.html")
            .defaultBehavior(
                behavior(origin, CachePolicy.CACHING_DISABLED, headers("NeverCache", NEVER_CACHE)))
            .additionalBehaviors(
                Map.of(
                    HASHED_ASSETS,
                    behavior(
                        origin,
                        CachePolicy.CACHING_OPTIMIZED,
                        headers("CacheForever", CACHE_FOREVER))))
            // The app routes in the browser, so a deep link like /workouts/123 is not a file.
            // S3 answers 403 for a missing key when the caller cannot list the bucket
            .errorResponses(List.of(spaFallback(403), spaFallback(404)))
            // North America and Europe only: the cheapest edge locations
            .priceClass(PriceClass.PRICE_CLASS_100)
            .build();

    Validations.of(bucket)
        .acknowledge(
            Acknowledgment.builder()
                .id("AwsSolutions-S1")
                .reason(
                    "Only CloudFront reads the bucket and the deployment writes it; access logs"
                        + " would need a second bucket for no new information")
                .build());

    Validations.of(distribution)
        .acknowledge(
            Acknowledgment.builder()
                .id("AwsSolutions-CFR1")
                .reason("Personal app with no regional restrictions to enforce")
                .build(),
            Acknowledgment.builder()
                .id("AwsSolutions-CFR2")
                .reason(
                    "WAF is billed per web ACL and per request; the app is static files and the"
                        + " API behind it requires a Cognito token")
                .build(),
            Acknowledgment.builder()
                .id("AwsSolutions-CFR3")
                .reason(
                    "Access logs would need a log bucket; the API access logs already record"
                        + " every call that matters")
                .build(),
            Acknowledgment.builder()
                .id("AwsSolutions-CFR4")
                .reason(
                    "The default cloudfront.net certificate does not allow choosing the minimum"
                        + " TLS version; that needs a custom domain, see docs/decisions.md")
                .build());
  }

  private static BehaviorOptions behavior(
      final IOrigin origin, final ICachePolicy cachePolicy, final ResponseHeadersPolicy headers) {
    return BehaviorOptions.builder()
        .origin(origin)
        .viewerProtocolPolicy(ViewerProtocolPolicy.REDIRECT_TO_HTTPS)
        .cachePolicy(cachePolicy)
        .responseHeadersPolicy(headers)
        .build();
  }

  // Sets Cache-Control for the browser, whatever S3 says, plus the usual security headers
  private ResponseHeadersPolicy headers(final String name, final String cacheControl) {
    return ResponseHeadersPolicy.Builder.create(this, name + "Headers")
        .customHeadersBehavior(
            ResponseCustomHeadersBehavior.builder()
                .customHeaders(
                    List.of(
                        ResponseCustomHeader.builder()
                            .header("Cache-Control")
                            .value(cacheControl)
                            .override(true)
                            .build()))
                .build())
        .securityHeadersBehavior(
            ResponseSecurityHeadersBehavior.builder()
                .strictTransportSecurity(
                    ResponseHeadersStrictTransportSecurity.builder()
                        .accessControlMaxAge(Duration.days(365))
                        .override(true)
                        .build())
                .contentTypeOptions(
                    ResponseHeadersContentTypeOptions.builder().override(true).build())
                .frameOptions(
                    ResponseHeadersFrameOptions.builder()
                        .frameOption(HeadersFrameOption.DENY)
                        .override(true)
                        .build())
                .referrerPolicy(
                    ResponseHeadersReferrerPolicy.builder()
                        .referrerPolicy(HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                        .override(true)
                        .build())
                .build())
        .build();
  }

  private static ErrorResponse spaFallback(final int status) {
    return ErrorResponse.builder()
        .httpStatus(status)
        .responseHttpStatus(200)
        .responsePagePath("/index.html")
        .ttl(Duration.seconds(0))
        .build();
  }

  // Origin of the app, for CORS on the API and for the stack outputs
  public String getUrl() {
    return "https://" + distribution.getDistributionDomainName();
  }

  // Where the deploy script uploads the build
  public String getBucketName() {
    return bucket.getBucketName();
  }
}
