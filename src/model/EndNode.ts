export class EndNode {
  vendorThingID: string;
  thingID: string;
  accessToken: string;
  connection: boolean;
  type: string = 'EnergyNode';
  password: string = '12345';
  lastUpdate: number = new Date().valueOf();
  online: boolean = true;

  constructor(vendorThingID) {
    this.vendorThingID = vendorThingID;
  }

}

export declare type EndNodes = EndNode[];
