import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaEventTarget } from 'aws-cdk-lib/aws-events-targets';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { CfnQueue } from 'aws-cdk-lib/aws-mediaconvert';
import { join } from 'path';
import { buildBackendSecretName, buildResourceName } from '../utils/naming';

const pathRoot = join(__dirname, '../../../../');
const pathApi = join(pathRoot, 'apps', 'api');

export interface MediaStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  s3BucketName: string;
  cfImagesDomain: string;
}

export class MediaStack extends Stack {
  constructor(scope: Construct, id: string, props: MediaStackProps) {
    super(scope, id, props);

    const mediaConvertQueue = new CfnQueue(this, 'MediaConvertQueue', {
      name: buildResourceName('MediaConvertQueue', props.applicationStage, props.awsRegion),
      description: 'On-demand queue for Gatherle event-moment video transcoding',
      pricingPlan: 'ON_DEMAND',
    });

    const imagesBucketRef = Bucket.fromBucketName(this, 'ImportedImagesBucket', props.s3BucketName);

    // MediaConvert assumes this role to read the raw video from S3 and write HLS segments.
    const mediaConvertRole = new Role(this, 'MediaConvertRole', {
      roleName: buildResourceName('MediaConvertRole', props.applicationStage, props.awsRegion),
      assumedBy: new ServicePrincipal('mediaconvert.amazonaws.com'),
      description: 'Allows MediaConvert to read raw video and write HLS output to the Gatherle images S3 bucket',
    });
    imagesBucketRef.grantReadWrite(mediaConvertRole);

    const startTranscodeLambdaName = buildResourceName(
      'StartTranscodeJobLambdaFunction',
      props.applicationStage,
      props.awsRegion,
    );

    const startTranscodeLogGroup = new LogGroup(this, 'StartTranscodeJobLogGroup', {
      logGroupName: `/aws/lambda/${startTranscodeLambdaName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const startTranscodeLambda = new NodejsFunction(this, 'StartTranscodeJobLambdaFunction', {
      functionName: startTranscodeLambdaName,
      description: 'Triggered by S3 ObjectCreated events; submits a MediaConvert HLS transcoding job for video uploads',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(60),
      memorySize: 256,
      handler: 'startTranscodeJobHandler',
      entry: join(pathApi, 'lib', 'lambdaHandlers', 'startTranscodeJob.ts'),
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
      },
      environment: {
        STAGE: props.applicationStage,
        AWS_ACCOUNT_ID: this.account,
        S3_BUCKET_NAME: props.s3BucketName,
        MEDIA_CONVERT_QUEUE_ARN: mediaConvertQueue.attrArn,
        MEDIA_CONVERT_ROLE_ARN: mediaConvertRole.roleArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: startTranscodeLogGroup,
    });

    // Grant the Lambda permission to create MediaConvert jobs and pass the MediaConvert role.
    startTranscodeLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['mediaconvert:CreateJob', 'mediaconvert:DescribeEndpoints'],
        resources: ['*'],
      }),
    );
    startTranscodeLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [mediaConvertRole.roleArn],
      }),
    );

    // EventBridge rule: fire StartTranscodeJob only for raw video uploads (.mp4/.mov/.webm/.avi/.mkv).
    // Using a positive suffix filter at EventBridge level means HLS output files (.m3u8, .ts) written
    // back to the same bucket never trigger the Lambda — preventing recursive invocations and
    // the associated Lambda charges (~15 extra calls per video without this filter).
    // S3 must have eventBridgeEnabled=true on the bucket (set in S3BucketStack).
    new Rule(this, 'S3ObjectCreatedRule', {
      description: `Triggers StartTranscodeJob when a new raw video is uploaded to ${props.s3BucketName}`,
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [props.s3BucketName],
          },
          object: {
            key: [{ suffix: '.mp4' }, { suffix: '.mov' }, { suffix: '.webm' }, { suffix: '.avi' }, { suffix: '.mkv' }],
          },
        },
      },
      targets: [new LambdaEventTarget(startTranscodeLambda)],
    });

    const gatherleSecret = Secret.fromSecretNameV2(
      this,
      'ImportedSecret',
      buildBackendSecretName(props.applicationStage, props.awsRegion),
    );

    const onTranscodeEventName = buildResourceName(
      'OnTranscodeEventLambdaFunction',
      props.applicationStage,
      props.awsRegion,
    );

    const onTranscodeEventLogGroup = new LogGroup(this, 'OnTranscodeEventLogGroup', {
      logGroupName: `/aws/lambda/${onTranscodeEventName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const onTranscodeEventLambda = new NodejsFunction(this, 'OnTranscodeEventLambdaFunction', {
      functionName: onTranscodeEventName,
      description:
        'Triggered by MediaConvert COMPLETE/ERROR events; updates the EventMoment record in MongoDB with the HLS URL',
      runtime: Runtime.NODEJS_24_X,
      timeout: Duration.seconds(60),
      memorySize: 256,
      handler: 'onTranscodeEventHandler',
      entry: join(pathApi, 'lib', 'lambdaHandlers', 'onTranscodeEvent.ts'),
      projectRoot: pathRoot,
      depsLockFilePath: join(pathRoot, 'package-lock.json'),
      bundling: {
        tsconfig: join(pathApi, 'tsconfig.json'),
        sourceMap: true,
        minify: false,
        nodeModules: ['@typegoose/typegoose', 'reflect-metadata', 'mongoose', 'mongodb'],
      },
      environment: {
        STAGE: props.applicationStage,
        SECRET_ARN: gatherleSecret.secretArn,
        CF_IMAGES_DOMAIN: props.cfImagesDomain,
        S3_BUCKET_NAME: props.s3BucketName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      logGroup: onTranscodeEventLogGroup,
    });

    gatherleSecret.grantRead(onTranscodeEventLambda);

    // Allow the Lambda to delete the original raw video after transcoding is complete.
    imagesBucketRef.grantDelete(onTranscodeEventLambda);

    // EventBridge rule: fire OnTranscodeEvent when a MediaConvert job transitions to COMPLETE or ERROR.
    new Rule(this, 'MediaConvertJobStateRule', {
      description: 'Routes MediaConvert COMPLETE/ERROR events to the OnTranscodeEvent Lambda',
      eventPattern: {
        source: ['aws.mediaconvert'],
        detailType: ['MediaConvert Job State Change'],
        detail: {
          status: ['COMPLETE', 'ERROR'],
          queue: [mediaConvertQueue.attrArn],
        },
      },
      targets: [new LambdaEventTarget(onTranscodeEventLambda)],
    });
  }
}
