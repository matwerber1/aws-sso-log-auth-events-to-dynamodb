const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
var zlib = require('zlib');

exports.handler = async function(input, context) {
  var payload = Buffer.from(input.awslogs.data, 'base64');
  var result = await unzip(payload);
  result = JSON.parse(result.toString('ascii'));

  console.log('Received event: ', JSON.stringify(result, null, 2));

  for (const event of result.logEvents) {
    
    var message = event.message;
    message = JSON.parse(message);

    var params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        username: message.userIdentity.userName,
        account: message.userIdentity.accountId,
        time: message.eventTime,
        source: message.eventSource,
        event: message.eventName,
        sourceIp: message.sourceIPAddress
      }
    };

    console.log('writing auth record to DynamoDB: ', JSON.stringify(params.Item));
    await ddb.put(params).promise();
    
  }
};

async function unzip(input) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(input, function (e, result) {
      if (e) { reject(e) }
      else {
        resolve(result);
      }
    });
  });
}