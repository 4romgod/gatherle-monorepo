import {Construct} from 'constructs';
import {ContainerImage, LogDrivers} from 'aws-cdk-lib/aws-ecs';
import {FargateTaskDefinition, Protocol} from 'aws-cdk-lib/aws-ecs';
import {LogGroup, RetentionDays} from 'aws-cdk-lib/aws-logs';
import {NtlangoEnvironmentVariables} from '../constants';
import {API_CONTAINER_NAME, API_PORT, APP_NAME} from '../constants';
import {ManagedPolicy} from 'aws-cdk-lib/aws-iam';
import {IRepository} from 'aws-cdk-lib/aws-ecr';
import {capitalize} from '../utils';
import {RemovalPolicy} from 'aws-cdk-lib';

export interface FargateTaskConstructProps {
    disambiguator: string;
    stage: string;
    ecrRepository: IRepository;
    environmentVariables: NtlangoEnvironmentVariables;
}

export class FargateTaskConstruct extends Construct {
    public readonly fargateTask: FargateTaskDefinition;

    constructor(scope: Construct, id: string, props: FargateTaskConstructProps) {
        super(scope, id);

        const {stage} = props;
        const capitalizedStage = capitalize(stage);

        const taskDefinition = new FargateTaskDefinition(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}FargateTaskDefinitionId`, {
            memoryLimitMiB: 2048,
            cpu: 1024,
        });
        taskDefinition.executionRole?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'));

        taskDefinition.addContainer(`${APP_NAME}${capitalizedStage}${props.disambiguator}EcrContainterId`, {
            containerName: `${API_CONTAINER_NAME}`,
            portMappings: [
                {
                    protocol: Protocol.TCP,
                    containerPort: API_PORT,
                },
            ],
            image: ContainerImage.fromEcrRepository(props.ecrRepository),
            environment: {
                ...props.environmentVariables,
            },
            logging: LogDrivers.awsLogs({
                streamPrefix: `${APP_NAME}-${stage}-${props.disambiguator}-on-fargate`.toLowerCase(),
                logGroup: new LogGroup(this, `${APP_NAME}${capitalizedStage}${props.disambiguator}LogGroupId`, {
                    logGroupName: `${APP_NAME}${capitalizedStage}${props.disambiguator}LogGroup`,
                    retention: RetentionDays.ONE_MONTH,
                    removalPolicy: RemovalPolicy.DESTROY,
                }),
            }),
        });

        this.fargateTask = taskDefinition;
    }
}
