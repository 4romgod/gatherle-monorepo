import { RemovalPolicy, Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  CachedMethods,
  Distribution,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { Bucket, BucketEncryption, BlockPublicAccess, ObjectOwnership, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { APPLICATION_STAGES, buildAllowedCorsOrigins } from '@gatherle/commons';
import { buildTargetSuffix } from '../utils/naming';

export interface S3BucketStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
}

export class S3BucketStack extends Stack {
  public readonly mediaBucket: Bucket;
  public readonly mediaDistribution: Distribution;
  public readonly mediaCdnDomainName: string;

  constructor(scope: Construct, id: string, props: S3BucketStackProps) {
    super(scope, id, props);

    const stage = props.applicationStage;
    const targetSuffix = buildTargetSuffix(stage, props.awsRegion);
    const allowedCorsOrigins = buildAllowedCorsOrigins(stage, process.env.CORS_ALLOWED_ORIGINS);

    this.mediaBucket = new Bucket(this, 'GatherleMediaBucket', {
      bucketName: `gatherle-media-${targetSuffix}`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Block public access by default (use pre-signed URLs for access)
      publicReadAccess: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: stage === APPLICATION_STAGES.PROD ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== APPLICATION_STAGES.PROD, // Only auto-delete in non-prod environments
      versioned: stage === APPLICATION_STAGES.PROD,
      // Forward object-lifecycle events to Amazon EventBridge so the MediaStack
      // can trigger the transcoding pipeline without creating a cross-stack circular dependency.
      eventBridgeEnabled: true,
      // CORS configuration for direct uploads from web app
      cors: [
        {
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
            HttpMethods.HEAD,
          ] as any,
          allowedOrigins: allowedCorsOrigins,
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    // CORS response headers policy — required for hls.js and any XHR-based media loading.
    // hls.js loads .m3u8 manifests and .ts segments via XHR; the browser blocks responses
    // without Access-Control-Allow-Origin. Using * is safe for read-only public media.
    const mediaCorsPolicy = new ResponseHeadersPolicy(this, 'MediaCorsResponseHeadersPolicy', {
      responseHeadersPolicyName: `gatherle-media-cors-${targetSuffix}`,
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlAllowOrigins: ['*'],
        accessControlMaxAge: Duration.seconds(600),
        originOverride: true,
      },
    });

    const mediaCachePolicy = new CachePolicy(this, 'MediaCachePolicy', {
      comment: 'Short-lived cache for Gatherle media with stable object keys.',
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.minutes(1),
      maxTtl: Duration.hours(1),
      cookieBehavior: CacheCookieBehavior.none(),
      headerBehavior: CacheHeaderBehavior.none(),
      queryStringBehavior: CacheQueryStringBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    this.mediaDistribution = new Distribution(this, 'GatherleMediaDistribution', {
      comment: `Gatherle media distribution for ${targetSuffix}`,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.mediaBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD,
        cachePolicy: mediaCachePolicy,
        responseHeadersPolicy: mediaCorsPolicy,
      },
    });

    this.mediaCdnDomainName = this.mediaDistribution.distributionDomainName;

    new CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'S3 bucket name for storing media',
      exportName: `${targetSuffix}-MediaBucketName`,
    });

    new CfnOutput(this, 'MediaBucketArn', {
      value: this.mediaBucket.bucketArn,
      description: 'S3 bucket ARN for storing media',
      exportName: `${targetSuffix}-MediaBucketArn`,
    });

    new CfnOutput(this, 'MediaCdnDomain', {
      value: this.mediaCdnDomainName,
      description: 'CloudFront distribution domain for serving Gatherle-owned media',
      exportName: `${targetSuffix}-MediaCdnDomain`,
    });
  }
}
