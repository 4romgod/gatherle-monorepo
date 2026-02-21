import { CfnOutput, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { NsRecord, PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface DelegatedSubdomainConfig {
  subdomain: string;
  nameServers: string[];
}

export interface DnsStackProps extends StackProps {
  rootDomainName: string;
  delegatedSubdomains?: DelegatedSubdomainConfig[];
}

export class DnsStack extends Stack {
  public readonly hostedZone: PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new PublicHostedZone(this, 'GatherleRootHostedZone', {
      zoneName: props.rootDomainName,
    });

    for (const delegatedSubdomain of props.delegatedSubdomains ?? []) {
      new NsRecord(this, `DelegatedSubdomainNsRecord${delegatedSubdomain.subdomain.replace(/[^a-zA-Z0-9]/g, '')}`, {
        zone: this.hostedZone,
        recordName: delegatedSubdomain.subdomain,
        values: delegatedSubdomain.nameServers,
      });
    }

    new CfnOutput(this, 'RootHostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route53 hosted zone ID for the root domain',
      exportName: 'GatherleRootHostedZoneId',
    });

    new CfnOutput(this, 'RootHostedZoneNameServers', {
      value: Fn.join(', ', this.hostedZone.hostedZoneNameServers ?? []),
      description: 'Name servers to configure at domain registrar',
      exportName: 'GatherleRootHostedZoneNameServers',
    });
  }
}
