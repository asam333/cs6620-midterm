#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { ReplicatorStack } from '../lib/replicator-stack';
import { CleanerStack } from '../lib/cleaner-stack';

const app = new cdk.App();

const storageStack = new StorageStack(app, 'StorageStack');

new ReplicatorStack(app, 'ReplicatorStack', {
  srcBucket: storageStack.srcBucket,
  dstBucket: storageStack.dstBucket,
  tableT: storageStack.tableT,
});

new CleanerStack(app, 'CleanerStack', {
  dstBucket: storageStack.dstBucket,
  tableT: storageStack.tableT,
});

  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' 
