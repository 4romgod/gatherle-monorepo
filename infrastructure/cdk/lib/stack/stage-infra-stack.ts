import { CfnOutput, Fn, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { DNS_STACK_CONFIG } from '../constants/dns';

export interface StageInfraStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
  enableCustomDomains?: boolean;
}

/**
 * StageInfraStack owns the long-lived, rarely-changing DNS and TLS infrastructure for a
 * stage-region environment: the delegated Route 53 hosted zone and the wildcard ACM certificate.
 *
 * Both GraphQLStack and WebSocketApiStack consume these values via
 * `StringParameter.valueForStringParameter()`, which emits CloudFormation `{{resolve:ssm:...}}`
 * dynamic references resolved at deploy time — not during `cdk synth`. This means:
 *   - No `Fn::ImportValue` references: consumer stacks never block each other from deploying.
 *   - No synth-time AWS credentials required for SSM lookups.
 *   - `addDependency(stageInfraStack)` in setupAccount.ts is sufficient to guarantee ordering:
 *     CDK's deployment engine deploys StageInfraStack before the consumers, so the parameters
 *     always exist when CloudFormation resolves the dynamic references.
 *
 * SSM parameter paths:
 *   /gatherle/{stage}/{region}/stageHostedZoneId
 *   /gatherle/{stage}/{region}/stageCertificateArn  (only when enableCustomDomains=true)
 */
export class StageInfraStack extends Stack {
  readonly stageRegionDomainName: string;
  readonly stageHostedZoneNameServersOutput: CfnOutput;

  constructor(scope: Construct, id: string, props: StageInfraStackProps) {
    super(scope, id, props);

    const stageSegment = props.applicationStage.toLowerCase();
    const enableCustomDomains = props.enableCustomDomains ?? false;

    this.stageRegionDomainName = `${stageSegment}.${props.awsRegion.toLowerCase()}.${DNS_STACK_CONFIG.rootDomainName}`;

    const stageHostedZone = new PublicHostedZone(this, 'StageRegionHostedZone', {
      zoneName: this.stageRegionDomainName,
    });

    new StringParameter(this, 'StageHostedZoneIdParam', {
      parameterName: `/gatherle/${stageSegment}/${props.awsRegion}/stageHostedZoneId`,
      stringValue: stageHostedZone.hostedZoneId,
      description: 'Stage hosted zone ID — read by GraphQLStack and WebSocketApiStack at synth time',
    });

    this.stageHostedZoneNameServersOutput = new CfnOutput(this, 'stageHostedZoneNameServers', {
      value: Fn.join(', ', stageHostedZone.hostedZoneNameServers ?? []),
      description: 'Name servers for stage-region delegated hosted zone',
    });

    if (enableCustomDomains) {
      const stageCertificate = new Certificate(this, 'StageRegionDomainCertificate', {
        domainName: this.stageRegionDomainName,
        subjectAlternativeNames: [`*.${this.stageRegionDomainName}`],
        validation: CertificateValidation.fromDns(stageHostedZone),
      });

      new StringParameter(this, 'StageCertificateArnParam', {
        parameterName: `/gatherle/${stageSegment}/${props.awsRegion}/stageCertificateArn`,
        stringValue: stageCertificate.certificateArn,
        description: 'Stage ACM certificate ARN — read by GraphQLStack and WebSocketApiStack at synth time',
      });
    }
  }
}
