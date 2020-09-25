import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as log_destinations from '@aws-cdk/aws-logs-destinations';
import * as path from 'path';

export class SsoLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const REGION = SsoLambdaStack.of(this).region;
    const ACCOUNT = SsoLambdaStack.of(this).account;
    const LOG_GROUP_NAME = 'CloudTrail/log-all-events';

    // Your pre-existing CloudTrail log group:
    var cloudwatchLogGroupArn = 'arn:aws:logs:us-east-1:544941453660:log-group:CloudTrail/log-all-events:*';

    // DynamoDB Table to hold logged SSO authentication events:
    const table = new dynamodb.Table(this, 'SsoLogTable', {
      partitionKey: {
        name: 'username',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda function that receives events from CloudWatch Logs and writes them to DynamoDB:
    const fn = new lambda.Function(this, 'SsoLogProcessor', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/sso-log-processor')),
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    // Give Lambda write permission to our DynamoDB table:
    table.grantWriteData(fn);
    
    // Grant CloudWatch Logs permission to invoke this Lambda: 
    fn.addPermission('CloudWatchLogsPermission', {
      principal: new iam.ServicePrincipal(`logs.amazonaws.com`),
      action: "lambda:InvokeFunction",
      sourceAccount: ACCOUNT,
      sourceArn: cloudwatchLogGroupArn
    });

    const FILTER_PATTERN = logs.FilterPattern.literal('{$.eventSource = "sso.amazonaws.com" && $.eventName = "Authenticate"}');
    const LOG_GROUP = logs.LogGroup.fromLogGroupName(this, 'CloudTrailLogGroup', LOG_GROUP_NAME);

    // The subscription filter tells our CloudWatch Log group to send matching events to our Lambda function: 
    LOG_GROUP.addSubscriptionFilter('SsoAuthFilter', {
      filterPattern: FILTER_PATTERN,
      destination: new log_destinations.LambdaDestination(fn),
    });

  }
}
