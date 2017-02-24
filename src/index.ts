/// <reference types='node' />
import { App, EndNode, EndNodes, Gateway, User } from './model/index';
import { KiiBase, KiiHelper, KiiMqttHelper } from './KiiHelper/index';

import Q = require('q');
import low = require('lowdb');
import macaddress = require('macaddress');
import fs = require('fs');

const TIMESPAN = 300000; // 5 mins

class KiiGatewayAgent {
  static preinit() {
    let dir = './resource';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    // dir = './log';
    // if (!fs.existsSync(dir)) {
    //   fs.mkdirSync(dir);
    // }
    let db = new low('./resource/db.json');
    db.defaults({
      // requestTimes: 10,
      app: {
        'appID': 'appID',
        'appKey': 'appKey',
        'site': 'https://api-sg.kii.com'
      }, user: {
        'ownerToken': 'ownerToken',
        'userID': 'userID'
      }, gateway: {}, endNodes: []
    }).value();
  }

  kii: KiiBase;
  db: any;
  isHttp: boolean;
  private timer;

  constructor() {
    KiiGatewayAgent.preinit();
    this.isHttp = process.argv.indexOf('--mqtt') < 0;
    if (this.isHttp)
      this.kii = new KiiHelper();
    else {
      this.kii = new KiiMqttHelper();
    }
    this.db = new low('./resource/db.json');
    this.kii.app = this.db.get('app').value() as App;
    this.kii.user = this.db.get('user').value() as User;
    // this.kii.setCounter(this.db.get('requestTimes').value() as number);
  }

  /**
   * set app
   *
   * @param {string} _appID
   * @param {string} _appKey
   * @param {string} _site
   * @memberOf KiiGatewayAgent
   */
  setApp(_appID: string, _appKey: string, _site: string) {
    this.setTemporaryApp(_appID, _appKey, _site);
    this.db.set('app', this.kii.app).value();
  }

  /**
   * set app without overwriting the configuration
   *
   * @param {string} _appID
   * @param {string} _appKey
   * @param {string} _site
   * @memberOf KiiGatewayAgent
   */
  setTemporaryApp(_appID: string, _appKey: string, _site: string) {
    this.kii.setApp(_appID, _appKey, _site);
  }

  /**
   * set user
   *
   * @param {string} ownerToken
   * @param {string} ownerID
   *
   * @memberOf KiiGatewayAgent
   */
  setUser(ownerToken: string, ownerID: string) {
    this.setTemporaryUser(ownerToken, ownerID);
    this.db.set('user', this.kii.user).value();
  }

  /**
   * set user without overwriting the configuration
   *
   * @param {string} ownerToken
   * @param {string} ownerID
   *
   * @memberOf KiiGatewayAgent
   */
  setTemporaryUser(ownerToken: string, ownerID: string) {
    this.kii.setUser(ownerToken, ownerID);
  }

  /**
   * onboard gateway by owner
   *
   * @param {any} [properties]
   * @returns {promise}
   *
   * @memberOf KiiGatewayAgent
   */
  onboardGatewayByOwner(properties?) {
    let deferred = Q.defer()
    this.kii.onboardGatewayByOwner(properties).then((gateway: Gateway) => {
      this.db.set('gateway', gateway).value();
      deferred.resolve(gateway);
    }, error => deferred.reject(error))
    return deferred.promise;
  }

  /**
   * return if gateway is onboarding or not (by gateway thingID)
   *
   * @returns {boolean}
   *
   * @memberOf KiiGatewayAgent
   */
  isGatewayOnboarding(): boolean {
    return !!this.kii.gateway.thingID;
  }

  /**
   * onboard endnode with gateway by owner
   *
   * @param {string} endNodeVendorThingID
   * @param {any} [properties]
   * @returns {promise}
   *
   * @memberOf KiiGatewayAgent
   */
  onboardEndnodeByOwner(endNodeVendorThingID: string, properties?) {
    let local_endnode = this.getEndnode(endNodeVendorThingID);
    let deferred = Q.defer();
    let p = this.kii.onboardEndnodeByOwner(endNodeVendorThingID, properties);
    p.then((endnode: EndNode) => {
      if (this.isHttp) {
        if (local_endnode) {
          this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).write();
        }
        else {
          this.db.get('endNodes').push(endnode).write();
        }
        this.kii.updateEndnodeConnection(endnode, true);
      }
      deferred.resolve(endnode);
    }, error => deferred.reject(error));
    return deferred.promise;
  }

  /**
   * update endnode state
   *
   * @param {string} endNodeVendorThingID
   * @param {any} [states]
   * @returns {promise}
   *
   * @memberOf KiiGatewayAgent
   */
  updateEndnodeState(endNodeVendorThingID: string, states: Object) {
    let deferred = Q.defer();

    let endnode = this.getEndnode(endNodeVendorThingID);
    endnode.lastUpdate = new Date().valueOf();
    if (endnode.online) {
      this.kii.updateEndnodeState(endnode, states).then(
        res => deferred.resolve(res),
        error => deferred.reject(error)
      );
    } else {
      endnode.online = true;
      this.kii.updateEndnodeState(endnode, true).then(
        (res) => {
          this.kii.updateEndnodeState(endnode, states).then(
            res => deferred.resolve(res),
            error => deferred.reject(error)
          );
        },
        (error) => { deferred.reject(error) }
      );
    }

    this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).write();
    return deferred.promise;
  }

  /**
   * update endnode connectivity by vendorThingID
   *
   * @param {string} endNodeVendorThingID
   * @param {boolean} online
   * @returns {promise}
   *
   * @memberOf KiiGatewayAgent
   */
  updateEndnodeConnectivityByVendorThingID(endNodeVendorThingID: string, online: boolean) {
    let node = this.getEndnode(endNodeVendorThingID);
    let deferred = Q.defer();
    if (node) {
      this.kii.updateEndnodeConnection(node, online).then(
        res => deferred.resolve(res),
        error => deferred.reject(error)
      );
    } else {
      deferred.reject(new Error('endnode not found.'));
    }
    return deferred.promise;
  }

  /**
   * retrieve endnode onboarding status
   *
   * @param {string} endNodeVendorThingID
   * @returns {promise}
   *
   * @memberOf KiiGatewayAgent
   */
  getEndnode(endNodeVendorThingID: string): EndNode {
    return this.db.get('endNodes').find({ vendorThingID: endNodeVendorThingID }).value() as EndNode;
  }

  /**
   * update endnode connectivity
   *
   * @returns {EndNode}
   * @memberOf KiiGatewayAgent
   */
  updateEndnodeOnline() {
    let deferred = Q.defer();
    let promises = [];
    let endnodes = this.db.get('endNodes').value() as EndNodes;
    let now = new Date().valueOf();
    for (let endnode of endnodes) {
      if (!endnode.online) continue;
      if (now - endnode.lastUpdate < TIMESPAN) continue;
      let promise = this.kii.updateEndnodeConnection(endnode, false);
      promise.then(res => {
        endnode.online = false;
        this.db.get('endNodes').find({ 'vendorThingID': endnode.vendorThingID }).assign(endnode).write();
      }, err => console.log(err));
      promises.push(promise);
    }
    Q.allSettled(promises).then(results => {
      deferred.resolve(results);
    });
    return deferred.promise;
  }

  /**
   * activate endnode connectivity detecting
   *
   * @param {boolean} active
   *
   * @memberOf KiiGatewayAgent
   */
  activateEndnodeOnlineDetecting(active: boolean) {
    if (active) {
      if (this.timer) return;
      this.timer = setTimeout(() => { this.updateEndnodeOnline(); }, TIMESPAN);
    } else {
      if (!this.timer) return;
      clearTimeout(this.timer);
      this.timer = undefined;
    }
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
