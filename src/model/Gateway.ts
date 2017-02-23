import macaddress = require('macaddress');

export class Gateway {
  vendorThingID: string;
  thingID: string;
  accessToken: string;
  type: string = 'EnergyGateway';
  password: string = '12345';
  mqttEndpoint?: MqttEndpoint;

  constructor() {
    macaddress.one((err, mac) => {
      this.vendorThingID = mac.replace(/:/g, '');
    });
  }
}

export class MqttEndpoint {
  installationID: string;
  username: string;
  password: string;
  mqttTopic: string;
  host: string;
  portTCP: number;
  portSSL: number;
  portWS: number;
  portWSS: number;
  ttl: number;
}
