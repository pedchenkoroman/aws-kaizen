import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
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
  InstanceType,
  Vpc
} from 'aws-cdk-lib/aws-ec2';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal
} from 'aws-cdk-lib/aws-iam';
import {Action} from '../types/Action';

export class AwsKaizenStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lookup default vpc. Every aws account has one default vpc
    const vpc = Vpc.fromLookup(this, "Default VPC", {
      isDefault: true,
    });

    // Create a simple e2 instance
    const ec2 = new Instance(this, 'targetInstance', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.BURSTABLE2, InstanceSize.NANO),
      machineImage: new AmazonLinuxImage({generation: AmazonLinuxGeneration.AMAZON_LINUX_2}),
    });

    // Create a new role
    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });

    // Add policy to start/stop instances
    role.addToPrincipalPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ec2:Start*', 'ec2:Stop*'],
      resources: ['*']
    }));

    // Create a lambda function
    const turnOnOffLambda = new NodejsFunction(this, 'TurnOnOffLambda', {
      role, // Provide our role
      runtime: Runtime.NODEJS_20_X,
      entry: './lambda/turn-on-off-handler.ts',
      handler: 'handler',
      description: 'Turn on/off ec2 instance',
      bundling: {
        target: 'node20',
      },
    });

    // Create an ON rule
    new Rule(this, 'OnRule', {
      schedule: Schedule.expression('cron(0 12 * * ? *)'), // Daily at noon UTC
      targets: [new LambdaFunction(turnOnOffLambda, {
        // pass action and instanceId into lambda function
        event: RuleTargetInput.fromObject({
          action: Action.On,
          instanceId: ec2.instanceId
        })
      })]
    });

    // Create OFF rule
    new Rule(this, 'OffRule', {
      schedule: Schedule.expression('cron(15 12 * * ? *)'), // Daily at 12:15 PM UTC
      targets: [new LambdaFunction(turnOnOffLambda, {
        // pass action and instanceId into lambda function
        event: RuleTargetInput.fromObject({
          action: Action.Off,
          instanceId: ec2.instanceId
        })
      })]
    });
  }
}
