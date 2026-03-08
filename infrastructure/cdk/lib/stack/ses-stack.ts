import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { ConfigurationSet, EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { DNS_STACK_CONFIG } from '../constants/dns';
import { buildResourceName, buildTargetSuffix } from '../utils/naming';

export interface SesStackProps extends StackProps {
  applicationStage: string;
  awsRegion: string;
}

/**
 * Creates an SES domain identity for gatherle.com and the configuration set used by transactional
 * emails (email verification, password reset). Because the root gatherle.com hosted zone lives in
 * the dedicated DNS account, DNS records required for verification and deliverability must be added
 * manually — their values are emitted as CloudFormation outputs by this stack.
 *
 * Required DNS records in the gatherle.com hosted zone (DNS account):
 *   • 3× DKIM CNAME records  — from SesDkimRecord1/2/3 outputs
 *   • MX record on mail.gatherle.com  — from SesMailFromMxRecord output
 *   • TXT/SPF record on mail.gatherle.com  — from SesMailFromSpfRecord output
 */
export class SesStack extends Stack {
  readonly configurationSet: ConfigurationSet;
  readonly emailIdentity: EmailIdentity;

  constructor(scope: Construct, id: string, props: SesStackProps) {
    super(scope, id, props);

    const targetSuffix = buildTargetSuffix(props.applicationStage, props.awsRegion);

    // SES configuration sets group and track email sending for this domain (deliveries, bounces,
    // complaints, etc.) and allow us to attach event destinations or reputation metrics later.
    // For now this configuration set is primarily used by transactional emails (verification,
    // password reset) via the EmailIdentity defined below.
    this.configurationSet = new ConfigurationSet(this, 'SesConfigurationSet', {
      configurationSetName: buildResourceName('ses-config', props.applicationStage, props.awsRegion),
    });

    this.emailIdentity = new EmailIdentity(this, 'SesEmailIdentity', {
      identity: Identity.domain(DNS_STACK_CONFIG.rootDomainName),
      configurationSet: this.configurationSet,
      dkimSigning: true,
      // Use a dedicated MAIL FROM subdomain so bounce/complaint feedback loop works correctly.
      mailFromDomain: `mail.${DNS_STACK_CONFIG.rootDomainName}`,
    });

    // ── DKIM CNAME records ────────────────────────────────────────────────────
    // These three CNAME records must be added to the gatherle.com hosted zone in the DNS account
    // to pass DKIM verification and allow AWS to sign outgoing emails on our behalf.
    this.emailIdentity.dkimRecords.forEach((record, index) => {
      new CfnOutput(this, `SesDkimRecord${index + 1}`, {
        value: `${record.name} → ${record.value}`,
        description: `SES DKIM CNAME record ${index + 1} — add to ${DNS_STACK_CONFIG.rootDomainName} hosted zone (DNS account). Type: CNAME`,
        exportName: `SesDkimRecord${index + 1}-${targetSuffix}`,
      });
    });

    // ── MAIL FROM records ─────────────────────────────────────────────────────
    // These records must be added under mail.gatherle.com in the DNS account.
    // They enable SPF alignment and proper bounce/complaint routing via SES.
    new CfnOutput(this, 'SesMailFromMxRecord', {
      value: `10 feedback-smtp.${props.awsRegion}.amazonses.com`,
      description: `Add to mail.${DNS_STACK_CONFIG.rootDomainName} in the root hosted zone. Type: MX`,
      exportName: `SesMailFromMxRecord-${targetSuffix}`,
    });

    new CfnOutput(this, 'SesMailFromSpfRecord', {
      value: '"v=spf1 include:amazonses.com ~all"',
      description: `Add to mail.${DNS_STACK_CONFIG.rootDomainName} in the root hosted zone. Type: TXT`,
      exportName: `SesMailFromSpfRecord-${targetSuffix}`,
    });
  }

  /**
   * Grants the given Lambda function permission to send email via this SES domain identity.
   * Call this from setupAccount.ts after both stacks have been instantiated.
   */
  grantSendEmail(lambda: NodejsFunction): void {
    lambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: [
          // Sender domain identity — the Lambda sends from noreply@gatherle.com.
          `arn:aws:ses:${this.region}:${this.account}:identity/${DNS_STACK_CONFIG.rootDomainName}`,
          // SES also evaluates IAM against the configuration set when one is attached to the identity.
          `arn:aws:ses:${this.region}:${this.account}:configuration-set/${this.configurationSet.configurationSetName}`,
        ],
      }),
    );
  }
}
