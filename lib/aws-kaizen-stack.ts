import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {Rule, RuleTargetInput, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsKaizenStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function resource
    const turnOnOffLambda = new NodejsFunction(this, 'TurnOnOffLambda', {
      runtime: Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      entry: './lambda/turn-on-off-handler.ts',
      handler: 'handler',
      description: 'Turn on/off ec2 instance',
      bundling: {
        target: 'node20',
      },
    });

    new Rule(this, 'OnRule', {
      schedule: Schedule.expression('cron(45 5 * * ? *)'),
      targets: [new LambdaFunction(turnOnOffLambda, {event:RuleTargetInput.fromText('on')})]
    });

    new Rule(this, 'OffRule', {
      schedule: Schedule.expression('cron(0 21 * * ? *)'),
      targets: [new LambdaFunction(turnOnOffLambda, {event:RuleTargetInput.fromText('off')})]
    });
  }
}
