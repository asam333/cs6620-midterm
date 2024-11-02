import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';

export class StorageStack extends cdk.Stack {
  public readonly srcBucket: Bucket;
  public readonly dstBucket: Bucket;
  public readonly tableT: Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create src
    this.srcBucket = new Bucket(this, 'BucketSrc', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // creat dst
    this.dstBucket = new Bucket(this, 'BucketDst', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // create table
    this.tableT = new Table(this, 'TableT', {
      partitionKey: { name: 'OriginalObjectName', type: AttributeType.STRING },
      sortKey: { name: 'CopyTimestamp', type: AttributeType.NUMBER },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    //create GSI
    this.tableT.addGlobalSecondaryIndex({
      indexName: 'DisownedIndex',
      partitionKey: { name: 'Disowned', type: AttributeType.NUMBER },
      sortKey: { name: 'DisownedTimestamp', type: AttributeType.NUMBER },
    });

  }
};
