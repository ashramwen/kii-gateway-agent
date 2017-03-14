import { EndNode } from './index';

export class ESNode {
  thingID: string;
  timeStamp: string;
  state: any;
  fields?: Object

  static parse(endnode: EndNode): ESNode {
    let node = new ESNode();
    node.thingID = endnode.thingID;
    node.timeStamp = new Date(endnode.state.Timestamp).toISOString();
    node.state = endnode.state;
    delete node.state.Timestamp;
    delete node.state.deviceID;
    return node;
  }
}
