import { App } from 'aws-cdk-lib';
import { DNS_STACK_CONFIG } from './constants';
import { DnsStack } from './stack';
import { buildAccountScopedStackName } from './utils';

const app = new App();
const deploymentRegion = process.env.AWS_REGION;
const delegatedSubdomainsRaw = process.env.DELEGATED_SUBDOMAINS;

if (!deploymentRegion) {
  throw new Error(
    'Missing AWS region for DNS deployment. Provide `AWS_REGION` environment variable. Example: ' +
      '`AWS_REGION=af-south-1 npm run cdk:dns -w @gatherle/cdk -- deploy DnsStack --require-approval never --exclusively`.',
  );
}

let delegatedSubdomains: { subdomain: string; nameServers: string[] }[] | undefined;

if (delegatedSubdomainsRaw) {
  try {
    const parsed: { subdomain: string; nameServers: string[] }[] = JSON.parse(delegatedSubdomainsRaw);
    delegatedSubdomains = parsed.filter((entry) => entry.nameServers.length > 0);
  } catch {
    throw new Error(
      'Invalid DELEGATED_SUBDOMAINS value. Must be a JSON array of { subdomain, nameServers[] } objects. ' +
        'Example: `[{"subdomain":"beta.af-south-1","nameServers":["ns-1.awsdns-01.org"]}]`',
    );
  }
}

new DnsStack(app, 'DnsStack', {
  env: {
    account: DNS_STACK_CONFIG.accountNumber,
    region: deploymentRegion,
  },
  stackName: buildAccountScopedStackName('dns-root-zone', DNS_STACK_CONFIG.accountNumber),
  rootDomainName: DNS_STACK_CONFIG.rootDomainName,
  delegatedSubdomains,
  description: 'Root Route53 hosted zone for Gatherle domain.',
});

app.synth();
