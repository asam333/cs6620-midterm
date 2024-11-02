import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const DST_BUCKET = process.env.DST_BUCKET!;
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async () => {
  const endTime = Date.now() + 60000; // 在一分钟内多次执行

  while (Date.now() < endTime) {
    await performCleanup();
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待5秒
  }
};

async function performCleanup() {
  const currentTime = Date.now();
  const thresholdTime = currentTime - 10000; // 10秒前

  // 查询Disowned的副本
  const result = await dynamodb.query({
    TableName: TABLE_NAME,
    IndexName: 'DisownedIndex',
    KeyConditionExpression: 'Disowned = :disowned AND DisownedTimestamp <= :thresholdTime',
    ExpressionAttributeValues: {
      ':disowned': 1,
      ':thresholdTime': thresholdTime,
    },
  }).promise();

  const items = result.Items || [];

  for (const item of items) {
    // 删除S3中的副本
    await s3.deleteObject({
      Bucket: DST_BUCKET,
      Key: item.CopyObjectName,
    }).promise();

    // 从DynamoDB中删除记录
    await dynamodb.delete({
      TableName: TABLE_NAME,
      Key: {
        OriginalObjectName: item.OriginalObjectName,
        CopyTimestamp: item.CopyTimestamp,
      },
    }).promise();
  }
};

