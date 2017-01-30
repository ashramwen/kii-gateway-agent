/// <reference types="node" />
/// <reference types="lowdb" />
import Q = require('q');
import low = require('lowdb');
import macaddress = require('macaddress');

import { App, EndNode, Gateway, User } from './model/index';
import { init } from './init';
import { KiiHelper } from './KiiHelper/KiiHelper';

class KiiGatewayAgent {
  kii: KiiHelper;
  db;
  constructor() {
    init();
    this.db = new low('./resource/db.json');
  }

  // kii init
  init(_appID: string, _appKey: string, _site) {
    this.kii = new KiiHelper(_appID, _appKey, _site);
    this.db.set('app', this.kii.app).value();
  }

  setUser(ownerToken: string, ownerID: string) {
    this.kii.setUser(ownerToken, ownerID);
    this.db.set('user', this.kii.user).value();
  }

  // onboard gateway by owner
  onboardGatewayByOwner(properties?) {
    let deferred = Q.defer()
    this.kii.onboardGatewayByOwner(properties).then((gateway: Gateway) => {
      this.db.set('gateway', gateway).value()
      deferred.resolve(gateway);
    }, error => deferred.reject(new Error(error)))
    return deferred.promise;
  }

  // onboard endnode with gateway by owner
  onboardEndnodeByOwner(endNodeVendorThingID: string, properties?) {
    let local_endnode = this.detectEndnodeOnboardingStatus(endNodeVendorThingID);
    let deferred = Q.defer();
    this.kii.onboardEndnodeByOwner(endNodeVendorThingID, properties).then((endnode: EndNode) => {
      if (local_endnode) {
        this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).value();
      }
      else {
        this.db.get('endNodes').push(endnode).value();
      }
      deferred.resolve(endnode);
    }, error => deferred.reject(new Error(error)));
    return deferred.promise;
  }

  // update endnode state
  updateEndnodeState(endNodeThingID: string, states) {
    let deferred = Q.defer()
    this.kii.updateEndnodeState(endNodeThingID, states).then(
      res => deferred.resolve(res),
      error => deferred.reject(new Error(error))
    );
    return deferred.promise
  }

  // update endnode connectivity
  updateEndnodeConnectivity(endNodeThingID: string, online: boolean) {
    let deferred = Q.defer()
    this.kii.updateEndnodeConnectivity(endNodeThingID, online).then(
      res => deferred.resolve(res),
      error => deferred.reject(new Error(error))
    );
    return deferred.promise
  }

  // retrive endnode onboarding status
  detectEndnodeOnboardingStatus(endNodeVendorThingID: string): EndNode {
    return this.db.get('endNodes').find({ vendorThingID: endNodeVendorThingID }).value() as EndNode;
  }

  // mqtt
  // let messageHandler;
  // startCommandReceiver(chainInput) {
  //     let deferred = Q.defer()
  //     let gatewayInfo = chainInput.gatewayInfo
  //     let mqttEndpoint = gatewayInfo.mqttEndpoint;
  //     let option = {
  //         'port': mqttEndpoint.portTCP,
  //         'clientId': mqttEndpoint.mqttTopic,
  //         'username': mqttEndpoint.username,
  //         'password': mqttEndpoint.password,
  //         'reconnectPeriod': 55000,
  //         'keepalive': 60
  //     }
  //     console.log(mqttEndpoint)
  //     let client = mqtt.connect('tcp://' + mqttEndpoint.host, option);
  //     client.on('connect', connack => {
  //         if (!connack.sessionPresent) {
  //             client.subscribe(mqttEndpoint.mqttTopic, {
  //                 qos: 0,
  //                 retain: false
  //             }, (err, granted) => {
  //                 if (err) deferred.reject(err)
  //             });
  //         } else {
  //             throw new Error('error connecting to MQTT broker')
  //         }
  //     })
  //     client.on('error', error => {
  //         throw new Error(error)
  //     })
  //     client.on('message', (topic, message, packet) => {
  //         let i;
  //         let messageStr = '';
  //         for (i = 0; i < message.length; i++) {
  //             messageStr += '%' + ('0' + message[i].toString(16)).slice(-2);
  //         }
  //         messageStr = decodeURIComponent(messageStr);
  //         this.messageHandler(messageStr)
  //     })
  // }

  // setOnCommandMessage(messageHandler) {
  //     this.messageHandler = messageHandler
  // }
}

export = KiiGatewayAgent;
