import { App } from 'aws-cdk-lib';
import { DNS_STACK_CONFIG } from './constants';
import { DnsStack } from './stack';
import { buildAccountScopedStackName } from './utils';

const app = new App();
const deploymentRegion = process.env.AWS_REGION;
const delegatedSubdomain = process.env.DELEGATED_SUBDOMAIN;
const delegatedNameServers = process.env.DELEGATED_NAME_SERVERS;

if (!deploymentRegion) {
  throw new Error(
    'Missing AWS region for DNS deployment. Provide `AWS_REGION` environment variable. Example: ' +
      '`AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively`.',
  );
}

if ((delegatedSubdomain && !delegatedNameServers) || (!delegatedSubdomain && delegatedNameServers)) {
  throw new Error(
    'Invalid delegated subdomain configuration. Provide both `DELEGATED_SUBDOMAIN` and `DELEGATED_NAME_SERVERS` together.',
  );
}

new DnsStack(app, 'DnsStack', {
  env: {
    account: DNS_STACK_CONFIG.accountNumber,
    region: deploymentRegion,
  },
  stackName: buildAccountScopedStackName('dns-root-zone', DNS_STACK_CONFIG.accountNumber),
  rootDomainName: DNS_STACK_CONFIG.rootDomainName,
  delegatedSubdomains: delegatedSubdomain
    ? [
        {
          subdomain: delegatedSubdomain,
          nameServers: delegatedNameServers!.split(',').map((value) => value.trim()),
        },
      ]
    : undefined,
  description: 'Root Route53 hosted zone for Gatherle domain.',
});

app.synth();
