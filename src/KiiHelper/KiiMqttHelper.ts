/// <reference types='node' />
/// <reference path="../mqtt/mqttws31.d.ts" />
import Q = require('q');
import request = require('request');
const Paho = require('../mqtt/mqttws31');

import { KiiBase } from './KiiBase';
import { App, EndNode, EndNodeBody, Gateway, User } from '../model';

export class KiiMqttHelper extends KiiBase {

  client: Paho.MQTT.Client;

  constructor() {
    super();
    console.log('running in MQTT mode.');
  }

  onboardGatewayByOwner(properties?) {
    let deferred = Q.defer();
    super.onboardGatewayByOwner(properties).then(
      res => {
        this.connectMqtt(deferred);
      },
      err => deferred.reject(err));
    return deferred.promise;
  }

  onboardEndnodeByOwner(endNodeVendorThingID, properties?) {
    let deferred = Q.defer();
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
    deferred.resolve();
    return deferred.promise;
  }

  updateEndnodeState(endnode: EndNode, states) {
    let deferred = Q.defer();
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
    deferred.resolve();
    return deferred.promise;
  }

  updateEndnodeConnection(endnode: EndNode, online: boolean) {
    let deferred = Q.defer();
    let onboardingMessage = 'PUT\n';
    onboardingMessage += 'Content-type:application/json\n';
    onboardingMessage += `Authorization:Bearer ${this.user.ownerToken}\n`;

    // TODO: generate ID to check it back
    onboardingMessage += `X-Kii-RequestID:${endnode.vendorThingID} update connection\n`;

    // mandatory blank line
    onboardingMessage += '\n';
    onboardingMessage += JSON.stringify({ 'online': online });

    let topic = `p/${this.gateway.mqttEndpoint.mqttTopic}/thing-if/apps/${this.app.appID}/things/${this.gateway.thingID}/end-nodes/${endnode.thingID}/connection`;
    this.sendMessage(topic, onboardingMessage);
    deferred.resolve();
    return deferred.promise;
  }

  private connectMqtt(deferred?) {
    let mqtt = this.gateway.mqttEndpoint;
    let endpoint = `wss://${mqtt.host}:${mqtt.portWSS}/mqtt`;
    this.client = new Paho.MQTT.Client(endpoint, mqtt.mqttTopic);
    this.client.onConnectionLost = this.onConnectionLost;
    this.client.onMessageArrived = this.onMessageArrived.bind(this);

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
    console.log('MQTT Connection Lost:', responseObject.errorMessage);
  }

  private onMessageArrived(message: Paho.MQTT.Message) {
    let payload: Array<string> = message.payloadString.split('\n');
    if (+payload[0] > 299) {
      let requestID = this.find(payload, 'X-Kii-RequestID:');
      let msg = +payload[0] + requestID.replace('X-Kii-RequestID:', ' ');
      console.log('MQTT Message Arrived:', msg);
    }
  }

  private sendMessage(topic, message) {
    // console.log('topic:', topic);
    // console.log('message:', message);

    var _message = new Paho.MQTT.Message(message);
    _message.destinationName = topic;
    this.client.send(_message);
  }

  private startsWith(source, searchString) {
    return source.substr(0, searchString.length) === searchString;
  }

  private find(_array, predicate) {
    let ret: string;
    _array.forEach(s => {
      if (this.startsWith(s, predicate))
        ret = s;
    })
    return ret;
  }
}

