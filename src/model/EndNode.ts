import { Gateway, User } from './index';

export class EndNode {
  vendorThingID: string;
  thingID: string;
  accessToken: string;
  connection: boolean;
  type: string = 'EnergyNode';
  password: string = '12345';
  lastUpdate: number = new Date().valueOf();
  online: boolean = true;

  constructor(vendorThingID: string) {
    this.vendorThingID = vendorThingID;
  }

}

export declare type EndNodes = EndNode[];


export class EndNodeBody {
  endNodeVendorThingID: string;
  endNodePassword: string;
  gatewayThingID: string;
  endNodeThingType: string;
  owner: string;
  endNodeThingProperties?: Object;

  constructor(endnode: EndNode, gatewayThingID: string, userID: string, properties?: Object) {
    this.endNodeVendorThingID = endnode.vendorThingID;
    this.endNodePassword = endnode.password;
    this.gatewayThingID = gatewayThingID;
    this.endNodeThingType = endnode.type;
    this.owner = `USER:${userID}`;
    if (properties) this.endNodeThingProperties = properties;
  }
}
