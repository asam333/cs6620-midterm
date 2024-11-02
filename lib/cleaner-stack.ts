import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class CleanerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & {
    dstBucket: Bucket,
    tableT: Table,
  }) {
    super(scope, id, props);

    const cleanerFunction = new Function(this, 'CleanerFunction', {
      runtime: Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda/cleaner'),
      environment: {
        DST_BUCKET: props.dstBucket.bucketName,
        TABLE_NAME: props.tableT.tableName,
      },
    });

    // 权限设置
    props.dstBucket.grantReadWrite(cleanerFunction);
    props.tableT.grantReadWriteData(cleanerFunction);

    // 设置定时触发器
    const rule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.rate(cdk.Duration.minutes(1)),
    });

    rule.addTarget(new LambdaFunction(cleanerFunction));
  }
}

