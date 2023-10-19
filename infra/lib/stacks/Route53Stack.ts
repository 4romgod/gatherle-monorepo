import {Stack, App} from 'aws-cdk-lib';
import {Certificate, CertificateValidation} from 'aws-cdk-lib/aws-certificatemanager';
import {HostedZone, IHostedZone} from 'aws-cdk-lib/aws-route53';
import {APP_NAME, DOMAIN_NAME} from '../constants';
import {NtlangoStackProps} from '../constants';
import {capitalize} from '../utils';

export class Route53Stack extends Stack {
    readonly hostedZone: IHostedZone;
    readonly certificate: Certificate;

    constructor(scope: App, id: string, props: NtlangoStackProps) {
        super(scope, id, props);

        const {stage} = props;
        const capitalizedStage = capitalize(stage);

        this.hostedZone = HostedZone.fromLookup(this, `${APP_NAME}${capitalizedStage}HostedZoneId`, {
            domainName: `${stage}.${DOMAIN_NAME}`,
        });

        this.certificate = new Certificate(this, `${APP_NAME}${capitalizedStage}CertificateId`, {
            domainName: `${stage}.${DOMAIN_NAME}`,
            validation: CertificateValidation.fromDns(this.hostedZone),
            subjectAlternativeNames: [`api.${stage}.${DOMAIN_NAME}`],
        });
    }
}
