import macaddress = require('macaddress');

export class Gateway {
  vendorThingID: string;
  thingID: string;
  accessToken: string;
  type: string = 'EnergyGateway';
  password: string = '12345';
  mqttEndpoint?;

  constructor() {
    macaddress.one((err, mac) => {
      this.vendorThingID = mac.replace(/:/g, '');
    });
  }

}
