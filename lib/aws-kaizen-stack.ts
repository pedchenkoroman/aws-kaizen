import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {Rule, RuleTargetInput, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
import {
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType, Vpc
} from 'aws-cdk-lib/aws-ec2';
import {PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsKaizenStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, "Default VPC", {
      isDefault: true,
    });

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    role.addToPrincipalPolicy(PolicyStatement.fromJson({
      "Effect": "Allow",
      "Action": [
        "ec2:Start*",
        "ec2:Stop*"
      ],
      "Resource": "*"
    }))

    const ec2 = new Instance(this, 'targetInstance', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.NANO),
      machineImage: new AmazonLinuxImage({ generation: AmazonLinuxGeneration.AMAZON_LINUX_2 }),
    });

    const turnOnOffLambda = new NodejsFunction(this, 'TurnOnOffLambda', {
      runtime: Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
      entry: './lambda/turn-on-off-handler.ts',
      handler: 'handler',
      description: 'Turn on/off ec2 instance',
      bundling: {
        target: 'node20',
      },
      role,
    });

    new Rule(this, 'OnRule', {
      schedule: Schedule.expression('cron(45 5 * * ? *)'),
      targets: [new LambdaFunction(turnOnOffLambda, {event:RuleTargetInput.fromObject({action: 'on', instanceId: ec2.instanceId})})]
    });

    new Rule(this, 'OffRule', {
      schedule: Schedule.expression('cron(0 21 * * ? *)'),
      targets: [new LambdaFunction(turnOnOffLambda, {event:RuleTargetInput.fromObject({action: 'off', instanceId: ec2.instanceId})})]
    });
  }
}
