import {StackProps} from 'aws-cdk-lib';

export enum Stage {
    ALPHA = 'alpha',
    BETA = 'beta',
    GAMMA = 'gamma',
    PROD = 'prod',
}

export interface ServiceAccount {
    name: string;
    awsAccountId: string;
    awsRegion: string;
    stage: Stage;
}

export interface NtlangoEnvironmentVariables {
    API_DOMAIN: string;
    API_PORT: string;
    APP_S3_BUCKET_NAME: string;
    AWS_REGION: string;
    CLIENT_URL: string;
    COGNITO_USER_POOL_ID: string;
    COGNITO_CLIENT_ID: string;
    COGNITO_IDENTITY_POOL_ID: string;
    COGNITO_AUTH_ROLE_ARN: string;
    MONGO_DB_URL: string;
    STAGE: string;
}

export interface NtlangoStackProps extends StackProps {
    stage: string;
}
