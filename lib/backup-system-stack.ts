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

