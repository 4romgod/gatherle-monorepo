import {Stack, App, Duration, Fn} from 'aws-cdk-lib';
import {Peer, Port, SecurityGroup, Vpc} from 'aws-cdk-lib/aws-ec2';
import {Cluster} from 'aws-cdk-lib/aws-ecs';
import {ApplicationLoadBalancedFargateService} from 'aws-cdk-lib/aws-ecs-patterns';
import {Protocol} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {IRepository, Repository} from 'aws-cdk-lib/aws-ecr';
import {FargateTaskConstruct} from '../constructs/FargateTask';
import {API_ENDPOINTS, APP_NAME, NtlangoStackProps} from '../constants';
import {Certificate} from 'aws-cdk-lib/aws-certificatemanager';
import {capitalize} from '../utils';
import 'dotenv/config';

export interface FargateStackProps extends NtlangoStackProps {
    readonly disambiguator: string;
    readonly github: {
        repoOwner: string;
        repoName: string;
        token: string;
        branch: string;
    };
    readonly ecrRepositoryName: string;
    readonly certificate?: Certificate;
}

export class FargateStack extends Stack {
    readonly vpc: Vpc;
    readonly ecsCluster: Cluster;
    readonly ecrRepository: IRepository;
    readonly fargateService: ApplicationLoadBalancedFargateService;
    readonly fargateTaskDefinition: FargateTaskConstruct;

    constructor(scope: App, id: string, props: FargateStackProps) {
        super(scope, id, props);

        const {stage} = props;
        const capitalizedStage = capitalize(stage);

        this.vpc = new Vpc(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}VpcId`, {
            vpcName: `${APP_NAME}${capitalizedStage}${props.disambiguator}Vpc`,
            maxAzs: 3,
        });

        this.ecsCluster = new Cluster(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}EcsClusterId`, {
            clusterName: `${APP_NAME}${capitalizedStage}${props.disambiguator}EcsCluster`,
            vpc: this.vpc,
            containerInsights: true,
        });

        this.ecrRepository = Repository.fromRepositoryName(
            this,
            `${APP_NAME}${capitalizedStage}${props.disambiguator}EcrRepositoryId`,
            props.ecrRepositoryName,
        );

        this.fargateTaskDefinition = new FargateTaskConstruct(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}FargateTaskConstructId`, {
            stage,
            disambiguator: props.disambiguator,
            ecrRepository: this.ecrRepository,
            environmentVariables: {
                API_DOMAIN: `${process.env.API_DOMAIN}`,
                API_PORT: `${process.env.API_PORT}`,
                AWS_REGION: `${process.env.AWS_REGION}`,
                CLIENT_URL: `${process.env.CLIENT_URL}`,
                COGNITO_USER_POOL_ID: Fn.importValue(`${APP_NAME}${capitalizedStage}ExportedUserPool`),
                COGNITO_CLIENT_ID: Fn.importValue(`${APP_NAME}${capitalizedStage}ExportedUserPoolClient`),
                COGNITO_IDENTITY_POOL_ID: Fn.importValue(`${APP_NAME}${capitalizedStage}ExportedIdentityPool`),
                COGNITO_AUTH_ROLE_ARN: Fn.importValue(`${APP_NAME}${capitalizedStage}ExportedAuthRoleArn`),
                MONGO_DB_URL: `${process.env.MONGO_DB_URL}`,
                APP_S3_BUCKET_NAME: `${APP_NAME}-${stage}-${props.env?.region}-bucket`,
                STAGE: stage,
            },
        });

        const securityGroup = new SecurityGroup(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}SecurityGroupId`, {
            securityGroupName: `${APP_NAME}${capitalizedStage}${props.disambiguator}SecurityGroup`,
            description: `${APP_NAME} ${capitalizedStage} ${props.disambiguator} SecurityGroup`,
            vpc: this.vpc,
            allowAllOutbound: true,
        });
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'allow SSH access from anywhere');
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'allow HTTP traffic from anywhere');
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'allow HTTPS traffic from anywhere');

        this.fargateService = new ApplicationLoadBalancedFargateService(
            this,
            `${APP_NAME}${capitalizedStage}${props.disambiguator}FargateServiceId`,
            {
                serviceName: `${APP_NAME}${capitalizedStage}${props.disambiguator}FargateService`,
                cluster: this.ecsCluster,
                desiredCount: 1,
                taskDefinition: this.fargateTaskDefinition.fargateTask,
                publicLoadBalancer: true,
                securityGroups: [securityGroup],
            },
        );

        const scalableTarget = this.fargateService.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 10,
        });

        scalableTarget.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 50,
        });

        scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 50,
        });

        this.fargateService.targetGroup.configureHealthCheck({
            path: API_ENDPOINTS.healthcheck,
            port: 'traffic-port',
            protocol: Protocol.HTTP,
            interval: Duration.minutes(5),
        });

        // TODO Figure out why this causes a duplicate all of a sudden
        // this.fargateService.loadBalancer.addListener(`${APP_NAME}${capitalizedStage}${props.disambiguator}HttpsListener`, {
        //     protocol: ApplicationProtocol.HTTP,
        //     open: true,
        //     defaultTargetGroups: [this.fargateService.targetGroup],
        // });

        // TODO uncomment this code after we have bought the domain name
        // new ARecord(this, `${APP_NAME}${stage}DnsARecordId`, {
        //     recordName: `api.${props.stage}.${DOMAIN_NAME}`,
        //     zone: props.hostedZone,
        //     target: RecordTarget.fromAlias(new LoadBalancerTarget(this.fargateService.loadBalancer)),
        //     ttl: Duration.minutes(1),
        // });
    }
}
