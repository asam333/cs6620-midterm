import { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const DST_BUCKET = process.env.DST_BUCKET!;
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const srcBucket = record.s3.bucket.name;
    const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const eventName = record.eventName;

    if (eventName.startsWith('ObjectCreated:')) {
      // 处理PUT事件
      await handlePutEvent(srcBucket, srcKey);
    } else if (eventName.startsWith('ObjectRemoved:')) {
      // 处理DELETE事件
      await handleDeleteEvent(srcKey);
    }
  }
};

async function handlePutEvent(srcBucket: string, srcKey: string) {
  const copyTimestamp = Date.now();
  const copyKey = `${srcKey}-${copyTimestamp}`;

  // 复制对象到目标桶
  await s3.copyObject({
    CopySource: `${srcBucket}/${srcKey}`,
    Bucket: DST_BUCKET,
    Key: copyKey,
  }).promise();

  // 在DynamoDB中插入新记录
  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: {
      OriginalObjectName: srcKey,
      CopyTimestamp: copyTimestamp,
      CopyObjectName: copyKey,
      Disowned: 0,
    },
  }).promise();

  // 查询现有的副本
  const result = await dynamodb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'OriginalObjectName = :srcKey',
    ExpressionAttributeValues: {
      ':srcKey': srcKey,
    },
    ScanIndexForward: true, // 按CopyTimestamp升序
  }).promise();

  const items = result.Items || [];

  // 如果副本数量超过，删除最老的
  const MAX_COPIES = 3;
  if (items.length > MAX_COPIES) {
    const oldestItem = items[0];

    // 删除S3中的旧副本
    await s3.deleteObject({
      Bucket: DST_BUCKET,
      Key: oldestItem.CopyObjectName,
    }).promise();

    // 从DynamoDB中删除记录
    await dynamodb.delete({
      TableName: TABLE_NAME,
      Key: {
        OriginalObjectName: oldestItem.OriginalObjectName,
        CopyTimestamp: oldestItem.CopyTimestamp,
      },
    }).promise();
  }
}

async function handleDeleteEvent(srcKey: string) {
  // 查询所有相关的副本
  const result = await dynamodb.query({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'OriginalObjectName = :srcKey',
    ExpressionAttributeValues: {
      ':srcKey': srcKey,
    },
  }).promise();

  const items = result.Items || [];
  const disownedTimestamp = Date.now();

  // 更新每个副本的Disowned字段
  for (const item of items) {
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: {
        OriginalObjectName: item.OriginalObjectName,
        CopyTimestamp: item.CopyTimestamp,
      },
      UpdateExpression: 'SET Disowned = :disowned, DisownedTimestamp = :timestamp',
      ExpressionAttributeValues: {
        ':disowned': 1,
        ':timestamp': disownedTimestamp,
      },
    }).promise();
  }
}
