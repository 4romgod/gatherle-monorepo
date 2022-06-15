#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NtlangoCdkStack } from '../lib/ntlango-cdk-stack';

const app = new cdk.App();
new NtlangoCdkStack(app, 'NtlangoCdkStack');
