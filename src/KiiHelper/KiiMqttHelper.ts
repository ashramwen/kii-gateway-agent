/// <reference types='node' />
/// <reference path="../mqtt/mqttws31.d.ts" />
import Q = require('q');
import request = require('request');
import low = require('lowdb');
const Paho = require('../mqtt/mqttws31');

import { KiiBase } from './KiiBase';
import { App, EndNode, EndNodeBody, Gateway, User } from '../model';

export class KiiMqttHelper extends KiiBase {

  client: Paho.MQTT.Client;
  db: any = new low('./resource/db.json');

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
    let local_endnode = this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).value();
    if (local_endnode) {
      this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).write();
    }
    else {
      try {
        this.db.get('endNodes').push(endnode).write();
      } catch (err) {
        console.log(err);
        throw err;
      }
    }
    let onboardingMessage = 'POST\n';
    onboardingMessage += 'Content-type:application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json\n';
    onboardingMessage += `Authorization:Bearer ${this.user.ownerToken}\n`;

    // TODO: generate ID to check it back
    onboardingMessage += `X-Kii-RequestID:${endNodeVendorThingID} onboardings\n`;

    // mandatory blank line
    onboardingMessage += '\n';
    onboardingMessage += JSON.stringify(body);

    let topic = `p/${this.gateway.mqttEndpoint.mqttTopic}/thing-if/apps/${this.app.appID}/onboardings`;

    this.sendMessage(topic, onboardingMessage);
    deferred.resolve(endnode);
    return deferred.promise;
  }

  updateEndnodeState(endnode: EndNode, states) {
    let deferred = Q.defer();
    let onboardingMessage = 'PUT\n';
    onboardingMessage += 'Content-type:application/json\n';
    onboardingMessage += `Authorization:Bearer ${this.user.ownerToken}\n`;

    // TODO: generate ID to check it back
    onboardingMessage += `X-Kii-RequestID:${endnode.vendorThingID} updateState\n`;

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
    onboardingMessage += `X-Kii-RequestID:${endnode.vendorThingID} updateConnection\n`;

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
    this.client.onConnectionLost = this.onConnectionLost.bind(this);
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
    console.log('MQTT reconnecting.');
    this.connectMqtt();
  }

  private onMessageArrived(message: Paho.MQTT.Message) {
    console.log('onMessageArrived', message.payloadString);
    let payload = this.parseResponse(message.payloadString);
    console.log(JSON.stringify(payload));

    if (payload.statusCode > 299) {
      console.log(`MQTT Error: ${payload.requestID} ${payload.type}`);
      return;
    }

    // onboardings
    switch (payload.type) {
      case 'onboardings':
        let endnode = this.db.get('endNodes').find({ vendorThingID: payload.requestID }).value() as EndNode;
        endnode.thingID = payload.body.endNodeThingID;
        endnode.accessToken = payload.body.accessToken;
        endnode.online = true;
        this.db.get('endNodes').find({ 'vendorThingID': payload.requestID }).assign(endnode).write();
        this.updateEndnodeConnection(endnode, true);
        break;
    }
  }

  private sendMessage(topic, message) {
    // console.log('topic:', topic);
    // console.log('message:', message);

    var _message = new Paho.MQTT.Message(message);
    _message.destinationName = topic;
    this.client.send(_message);
  }

  // private includes(source: string, search: string, start?: number) {
  //   if (!start) start = 0;
  //   if (start + search.length > source.length) return false;
  //   return source.indexOf(search, start) !== -1;
  // }

  // private startsWith(source, searchString) {
  //   return this.includes(source, searchString, 0);
  // }

  // private endsWith(source, searchString) {
  //   if (searchString.length > source.length) return false;
  //   return this.includes(source, searchString, source.length - searchString.length);
  // }

  // private find(_array, predicate) {
  //   let ret: string;
  //   _array.forEach(s => {
  //     if (this.startsWith(s, predicate))
  //       ret = s;
  //   })
  //   return ret;
  // }

  // private getRequest(payload: Array<string>) {
  //   let requestID = this.find(payload, 'X-Kii-RequestID:');
  //   requestID = requestID.replace('X-Kii-RequestID:', '');
  //   return requestID.split(' ');
  // }

  private parseResponse(payloadString: string) {
    const codeReg = /^(\d{3})/;
    const requestReg = /X-Kii-RequestID:([^\n]*)/;
    const bodyReg = /(\{[^}]*\})/;
    let payload = new Payload();
    payload.statusCode = +codeReg.exec(payloadString)[1];
    let requestID = requestReg.exec(payloadString)[1].split(' ');
    payload.requestID = requestID[0];
    payload.type = requestID[1].replace('\r', '');
    let m;
    if ((m = bodyReg.exec(payloadString)) !== null) {
      payload.body = JSON.parse(m[1]);
    }
    return payload;
  }
}
class Payload {
  statusCode: number;
  requestID: string;
  type: string;
  date: string;
  body?: {
    accessToken: string,
    endNodeThingID: string
  };
}

