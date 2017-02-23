/// <reference types='node' />
/// <reference path="../mqtt/mqttws31.d.ts" />
import Q = require('q');
import request = require('request');
const Paho = require('../mqtt/mqttws31');

import { KiiBase } from './KiiBase';
import { App, EndNode, EndNodeBody, Gateway, User } from '../model';

export class KiiMqttHelper extends KiiBase {

  client: any;
  onboardings: Function[];

  constructor() {
    super();
    console.log('running in MQTT mode.');
  }

  onboardGatewayByOwner(properties?) {
    console.log(process.argv);
    let deferred = Q.defer();
    super.onboardGatewayByOwner(properties).then(
      res => {
        this.connectMqtt(deferred);
        // deferred.resolve(res);
      },
      err => deferred.reject(err));
    return deferred.promise;
  }

  onboardEndnodeByOwner(endNodeVendorThingID, properties?) {
    let endnode = new EndNode(endNodeVendorThingID);
    let body = new EndNodeBody(endnode, this.gateway.thingID, this.user.userID, properties);

    let onboardingMessage = 'POST\n';
    onboardingMessage += 'Content-type:application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json\n';
    onboardingMessage += `Authorization:Bearer ${this.user.ownerToken}\n`;

    // TODO: generate ID to check it back
    onboardingMessage += `X-Kii-RequestID:${endNodeVendorThingID} onboarding\n`;

    // mandatory blank line
    onboardingMessage += '\n';
    onboardingMessage += JSON.stringify(body);

    let topic = `p/${this.gateway.mqttEndpoint.mqttTopic}/thing-if/apps/${this.app.appID}/onboardings`;
    this.sendMessage(topic, onboardingMessage);
  }

  updateEndnodeState(endnode: EndNode, states) {
    let onboardingMessage = 'PUT\n';
    onboardingMessage += 'Content-type:application/json\n';
    onboardingMessage += `Authorization:Bearer ${this.user.ownerToken}\n`;

    // TODO: generate ID to check it back
    onboardingMessage += `X-Kii-RequestID:${endnode.vendorThingID} update state\n`;

    // mandatory blank line
    onboardingMessage += '\n';
    onboardingMessage += JSON.stringify(states);

    let topic = `p/${this.gateway.mqttEndpoint.mqttTopic}/thing-if/apps/${this.app.appID}/targets/THING:${endnode.thingID}/states`;
    this.sendMessage(topic, onboardingMessage);
  }

  updateEndnodeConnectivity(endNodeThingID: string, online: boolean) { }

  private connectMqtt(deferred?) {
    let mqtt = this.gateway.mqttEndpoint;
    let endpoint = `wss://${mqtt.host}:${mqtt.portWSS}/mqtt`;
    this.client = new Paho.MQTT.Client(endpoint, mqtt.mqttTopic);
    this.client.onConnectionLost = this.onConnectionLost;
    this.client.onMessageArrived = this.onMessageArrived;

    this.client.connect({
      onSuccess: () => {
        console.log('MQTT Connected');
        this.client.subscribe(mqtt.mqttTopic);
        if (deferred) deferred.resolve(this.gateway);
      },
      userName: mqtt.username,
      password: mqtt.password,
    });
  }

  private onConnectionLost(responseObject: Paho.MQTT.ResponseObject) {
    // if (responseObject.errorCode !== 0) {
    console.log('MQTT Connection Lost:' + responseObject.errorMessage);
    // }
  }

  private onMessageArrived(message: Paho.MQTT.Message) {
    let payload = message.payloadString;
    console.log('Message Arrived:', message.payloadString);
  }

  private sendMessage(topic, message) {
    // console.log('topic:', topic);
    console.log('message:', message);

    var _message = new Paho.MQTT.Message(message);
    _message.destinationName = topic;
    this.client.send(_message);
  }
}
