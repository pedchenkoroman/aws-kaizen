import {
  EC2Client,
  StopInstancesCommand,
  StartInstancesCommand
} from '@aws-sdk/client-ec2';
import {Event} from '../types/Event';

/**
 * Get command by action name
 */
const getCommand = (event: Event): StartInstancesCommand | StopInstancesCommand => {
  const commandsMap = {
    on: new StartInstancesCommand({
      InstanceIds: [event.instanceId],
    }),
    off: new StopInstancesCommand({
      InstanceIds: [event.instanceId],
      Force: true,
    })
  };

  return commandsMap[event.action];
}

export const handler = async (event: Event) => {
  const client = new EC2Client();
  const command = getCommand(event);
  const response = await client.send(command);
  console.log(JSON.stringify(response));
}