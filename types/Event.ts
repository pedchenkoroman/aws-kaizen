import {Action} from './Action';

export type Event = {
  action: Action;
  instanceId: string;
}