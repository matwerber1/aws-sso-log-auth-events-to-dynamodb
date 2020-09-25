#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SsoLambdaStack } from '../lib/sso-lambda-stack';

const app = new cdk.App();
new SsoLambdaStack(app, 'SsoLambdaStack');
