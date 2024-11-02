import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class ReplicatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & {
    srcBucket: Bucket,
    dstBucket: Bucket,
    tableT: Table,
  }) {
    super(scope, id, props);

    const replicatorFunction = new Function(this, 'ReplicatorFunction', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda/replicator'),
      environment: {
        DST_BUCKET: props.dstBucket.bucketName,
        TABLE_NAME: props.tableT.tableName,
      },
    });

    // 权限设置
    props.srcBucket.grantRead(replicatorFunction);
    props.dstBucket.grantReadWrite(replicatorFunction);
    props.tableT.grantReadWriteData(replicatorFunction);

    // 添加S3事件通知
    replicatorFunction.addEventSource(new S3EventSource(props.srcBucket, {
      events: [EventType.OBJECT_CREATED, EventType.OBJECT_REMOVED],
    }));
  }
}

