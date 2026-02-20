import { RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Bucket, BucketEncryption, BlockPublicAccess, ObjectOwnership, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { APPLICATION_STAGES } from '@gatherle/commons';
import { buildTargetSuffix } from '../utils/naming';

export interface S3BucketStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
}

export class S3BucketStack extends Stack {
  public readonly imagesBucket: Bucket;

  constructor(scope: Construct, id: string, props: S3BucketStackProps) {
    super(scope, id, props);

    const stage = props.applicationStage;
    const targetSuffix = buildTargetSuffix(stage, props.awsRegion);

    this.imagesBucket = new Bucket(this, 'GatherleImagesBucket', {
      bucketName: `gatherle-images-${targetSuffix}`,
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // Block public access by default (use pre-signed URLs for access)
      publicReadAccess: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: stage === APPLICATION_STAGES.PROD ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== APPLICATION_STAGES.PROD, // Only auto-delete in non-prod environments
      versioned: stage === APPLICATION_STAGES.PROD,
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
          allowedOrigins: ['*'], // TODO: Restrict to your domain in production
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    new CfnOutput(this, 'ImagesBucketName', {
      value: this.imagesBucket.bucketName,
      description: 'S3 bucket name for storing images',
      exportName: `${targetSuffix}-ImagesBucketName`,
    });

    new CfnOutput(this, 'ImagesBucketArn', {
      value: this.imagesBucket.bucketArn,
      description: 'S3 bucket ARN for storing images',
      exportName: `${targetSuffix}-ImagesBucketArn`,
    });
  }
}
