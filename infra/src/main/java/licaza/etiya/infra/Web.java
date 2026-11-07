package licaza.etiya.infra;

import java.util.List;
import java.util.Map;
import software.amazon.awscdk.Acknowledgment;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Validations;
import software.amazon.awscdk.services.certificatemanager.Certificate;
import software.amazon.awscdk.services.certificatemanager.CertificateValidation;
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
import software.amazon.awscdk.services.cloudfront.SecurityPolicyProtocol;
import software.amazon.awscdk.services.cloudfront.ViewerProtocolPolicy;
import software.amazon.awscdk.services.cloudfront.origins.S3BucketOrigin;
import software.amazon.awscdk.services.route53.ARecord;
import software.amazon.awscdk.services.route53.AaaaRecord;
import software.amazon.awscdk.services.route53.HostedZone;
import software.amazon.awscdk.services.route53.HostedZoneAttributes;
import software.amazon.awscdk.services.route53.IHostedZone;
import software.amazon.awscdk.services.route53.RecordTarget;
import software.amazon.awscdk.services.route53.targets.CloudFrontTarget;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.amazon.awscdk.services.s3.LifecycleRule;
import software.constructs.Construct;

// The PWA: a private bucket that only CloudFront can read, served on etiya.licaza.dev.
// The files are not part of the stack: web/scripts/deploy.sh builds and uploads them, and
// web/scripts/deploy-art.sh the exercise pictures
public class Web extends Construct {

  // The zone already exists, registered with the domain. Its id is not a credential, and a
  // lookup would need AWS credentials to synth and put the account id in cdk.context.json
  private static final String ZONE_NAME = "licaza.dev";
  private static final String ZONE_ID = "Z0300615D56TUX8HMJGF";
  private static final String DOMAIN = "etiya." + ZONE_NAME;

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
            // Also the only copy of the art under art/, which is not in the repo: versions keep
            // what an upload replaces, for a while
            .versioned(true)
            .lifecycleRules(
                List.of(
                    LifecycleRule.builder().noncurrentVersionExpiration(Duration.days(90)).build()))
            // CloudFormation deletes it only once emptied by hand, old versions included;
            // autoDeleteObjects would mean one more Lambda
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();

    // Origin Access Control: CloudFront signs its requests and the bucket policy only accepts
    // those, so the bucket stays private
    IOrigin origin = S3BucketOrigin.withOriginAccessControl(bucket);

    IHostedZone zone =
        HostedZone.fromHostedZoneAttributes(
            this,
            "Zone",
            HostedZoneAttributes.builder().hostedZoneId(ZONE_ID).zoneName(ZONE_NAME).build());

    // CloudFront only takes certificates from us-east-1, where the stack already lives
    Certificate certificate =
        Certificate.Builder.create(this, "Certificate")
            .domainName(DOMAIN)
            .validation(CertificateValidation.fromDns(zone))
            .build();

    this.distribution =
        Distribution.Builder.create(this, "Distribution")
            .comment("Etiya web app")
            .domainNames(List.of(DOMAIN))
            .certificate(certificate)
            .minimumProtocolVersion(SecurityPolicyProtocol.TLS_V1_2_2021)
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

    // Alias records: Route 53 answers them for free, and CloudFront serves IPv6 too
    RecordTarget target = RecordTarget.fromAlias(new CloudFrontTarget(distribution));
    ARecord.Builder.create(this, "Record").zone(zone).recordName(DOMAIN).target(target).build();
    AaaaRecord.Builder.create(this, "RecordIpv6")
        .zone(zone)
        .recordName(DOMAIN)
        .target(target)
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

  // Where the app is opened, for the invitation email and the stack outputs
  public String getUrl() {
    return "https://" + DOMAIN;
  }

  // For CORS on the API. The cloudfront.net origin stays until the apps installed from it
  // have been reinstalled from the domain
  public List<String> getOrigins() {
    return List.of(getUrl(), "https://" + distribution.getDistributionDomainName());
  }

  // Where the deploy script uploads the build
  public String getBucketName() {
    return bucket.getBucketName();
  }
}
