export class EndNode {
  vendorThingID: string;
  thingID: string;
  accessToken: string;
  connection: boolean;
  type: string = 'EnergyNodey';
  password: string = '12345';

  constructor(vendorThingID) {
    this.vendorThingID = vendorThingID;
  }

}
