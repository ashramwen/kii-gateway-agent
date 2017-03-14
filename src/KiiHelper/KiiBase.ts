/// <reference types='node' />

import Q = require('q');
import low = require('lowdb');
import request = require('request');
import _ = require('lodash');

import { App, EndNode, ESNode, Gateway, KiiThing, User } from '../model';

export abstract class KiiBase {

  /**
   * kii app
   *
   * @type {App}
   * @memberOf KiiBase
   */
  app: App;

  /**
   * user info
   *
   * @type {User}
   * @memberOf KiiBase
   */
  user: User;

  /**
   * gateway info
   *
   * @type {Gateway}
   * @memberOf KiiBase
   */
  gateway: Gateway;

  /**
   * db.json
   *
   * @protected
   * @type lowdb
   * @memberOf KiiBase
   */
  protected db: any = new low('./resource/db.json');

  /**
   * state cache
   *
   * @protected
   * @type lowdb
   * @memberOf KiiBase
   */
  private cache: any = new low('./resource/stateCache.json');

  /**
   * things that user owns
   *
   * @private
   * @type {KiiThing[]}
   * @memberOf KiiBase
   */
  private ownedThings: KiiThing[];

  /**
   * request count
   *
   * @private
   * @type {number}
   * @memberOf KiiBase
   */
  private counter: number = 0;

  /**
   * max request times
   *
   * @private
   * @type {number}
   * @memberOf KiiBase
   */
  private maxRequest: number = 10;

  constructor() {
    // gc mode
    if (global.gc) console.log('gc mode enables.');

    // init gateway
    this.gateway = new Gateway();

    // init cache file
    this.cache.defaults({ states: [] }).write();
  }

  /**
   * set kii app
   *
   * @param {any} _appID
   * @param {any} _appKey
   * @param {any} _site
   *
   * @memberOf KiiBase
   */
  setApp(_appID: string, _appKey: string, _site: string) {
    this.app = new App(_appID, _appKey, _site);
  }

  /**
   * set user
   *
   * @param {any} ownerToken
   * @param {any} ownerID
   *
   * @memberOf KiiBase
   */
  setUser(ownerToken: string, ownerID: string) {
    this.user = new User(ownerToken, ownerID);
  }

  /**
   * today date
   *
   * @returns {string}
   *
   * @memberOf KiiBase
   */
  protected today(): string {
    let today = new Date();
    let day = today.getDate();
    let month = today.getMonth() + 1;
    let year = today.getFullYear();
    return `${year}${month}${day}`;
  }

  /**
   * onboard gateway by owner
   *
   * @abstract
   * @param {any} [properties]
   *
   * @memberOf KiiBase
   */
  onboardGatewayByOwner(properties?: Object) {
    let body = {
      'vendorThingID': this.gateway.vendorThingID,
      'thingPassword': this.gateway.password,
      'thingType': this.gateway.type,
      'owner': `USER:${this.user.userID}`,
      'layoutPosition': 'GATEWAY'
    };
    if (properties) body['thingProperties'] = properties;

    let deferred = Q.defer();
    let options = {
      method: 'POST',
      url: `${this.app.site}/thing-if/apps/${this.app.appID}/onboardings`,
      headers: {
        authorization: `Bearer ${this.user.ownerToken}`,
        'content-type': 'application/vnd.kii.onboardingWithVendorThingIDByOwner+json',
        'Connection': 'keep-alive'
      },
      agentOptions: {
        ciphers: 'DES-CBC3-SHA'
      },
      body: JSON.stringify(body)
    };

    request(options, (error, response, body) => {
      this.gcByCounter();
      if (error) deferred.reject(new Error(error));
      body = JSON.parse(body);
      this.gateway.thingID = body.thingID;
      this.gateway.accessToken = body.accessToken;
      this.gateway.mqttEndpoint = body.mqttEndpoint;
      deferred.resolve(this.gateway);
    });

    return deferred.promise;
  }

  /**
   * cache states into cache.json
   *
   * @protected
   * @param {EndNodee} endnode
   *
   * @memberOf KiiBase
   */
  protected cacheStates(endnode: EndNode) {
    let esnode = ESNode.parse(endnode);
    let record = this.cache.get('states').find({ thingID: endnode.thingID });
    if (record.value()) {
      record.get('cache').push(esnode).write();
    } else {
      this.cache.get('states').push({
        thingID: endnode.thingID,
        cache: [esnode]
      }).write();
    }
  }

  /**
   * get all owned things from Kii by user
   *
   * @private
   * @returns Promise
   *
   * @memberOf KiiBase
   */
  private getOwnedThings() {
    let deferred = Q.defer();
    let options = {
      method: 'POST',
      url: `${this.app.site}/api/apps/${this.app.appID}/users/${this.user.userID}/buckets/OWNED_THINGS/query`,
      headers: {
        Authorization: `Bearer ${this.user.ownerToken}`,
        'Content-Type': 'application/vnd.kii.QueryRequest+json',
        'Connection': 'keep-alive'
      },
      agentOptions: {
        ciphers: 'DES-CBC3-SHA'
      },
      body: JSON.stringify({
        'bucketQuery': {
          'clause': {
            'type': 'all'
          }
        }
      })
    };

    request(options, (error, response, body) => {
      this.gcByCounter();
      if (error) deferred.reject(new Error(error));
      body = `{
  "queryDescription": "WHERE ( 1=1 )",
  "results": [{
    "vendorThingID": "0000",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:15.388Z",
    "_created": 1487148098367,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:44.598Z",
    "_id": "90d20cf0-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "TV",
      "_numberField1": 160,
      "_stringField3": "plug_04",
      "_stringField2": "Livingroom",
      "_numberField2": 690,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456544844,
    "_version": "730",
    "thingID": "th.ba28b2d34b60-18ab-6e11-743f-04351638"
  }, {
    "vendorThingID": "0001",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:15.442Z",
    "_created": 1487148101571,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:34.757Z",
    "_id": "92baf130-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Refrigerator",
      "_numberField1": 575,
      "_stringField3": "plug_07",
      "_stringField2": "Kitchen",
      "_numberField2": 845,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456535076,
    "_version": "147",
    "thingID": "th.7c698b427320-e56a-6e11-743f-0b7b9638"
  }, {
    "vendorThingID": "0002",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:15.734Z",
    "_created": 1487148105022,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:47.493Z",
    "_id": "94c985e0-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Rice Cooker",
      "_numberField1": 740,
      "_stringField3": "plug_02",
      "_stringField2": "Kitchen",
      "_numberField2": 845,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456547707,
    "_version": "129",
    "thingID": "th.ba28b2d34b60-18ab-6e11-743f-0f546938"
  }, {
    "vendorThingID": "0003",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:15.897Z",
    "_created": 1487148108501,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:34.855Z",
    "_id": "96dc6050-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Washing Machine",
      "_numberField1": 915,
      "_stringField3": "plug_03",
      "_stringField2": "Kitchen",
      "_numberField2": 845,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456535077,
    "_version": "734",
    "thingID": "th.7c698b427320-e56a-6e11-743f-007dea38"
  }, {
    "vendorThingID": "0004",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:16.126Z",
    "_created": 1487148111625,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:38.253Z",
    "_id": "98b90f90-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Computer 1",
      "_numberField1": 325,
      "_stringField3": "plug_01",
      "_stringField2": "Livingroom",
      "_numberField2": 690,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456538463,
    "_version": "142",
    "thingID": "th.ba28b2d34b60-18ab-6e11-743f-07612d38"
  }, {
    "vendorThingID": "0005",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:16.179Z",
    "_created": 1487148114647,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:49.487Z",
    "_id": "9a862e70-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Computer 2",
      "_numberField1": 500,
      "_stringField3": "plug_01",
      "_stringField2": "Study",
      "_numberField2": 436,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456549701,
    "_version": "127",
    "thingID": "th.7c698b427320-e56a-6e11-743f-0cc2ad38"
  }, {
    "vendorThingID": "0006",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:16.593Z",
    "_created": 1487148118126,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:39.872Z",
    "_id": "9c9908e0-f35a-11e6-a65e-023724b896c7",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Fan 1",
      "_numberField1": 335,
      "_stringField3": "plug_05",
      "_stringField2": "Study",
      "_numberField2": 436,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456540089,
    "_version": "723",
    "thingID": "th.ba28b2d34b60-18ab-6e11-743f-002d7148"
  }, {
    "vendorThingID": "0007",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:16.879Z",
    "_created": 1487148121105,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:50.328Z",
    "_id": "9e5f9810-f35a-11e6-ba81-06b43d2b82ab",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Fan 2",
      "_numberField1": 740,
      "_stringField3": "plug_05",
      "_stringField2": "Bedroom 2",
      "_numberField2": 330,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456550577,
    "_version": "733",
    "thingID": "th.7c698b427320-e56a-6e11-743f-08cf4448"
  }, {
    "vendorThingID": "0008",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:16.887Z",
    "_created": 1487148125085,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:41.136Z",
    "_id": "a0bee4d0-f35a-11e6-ba81-06b43d2b82ab",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Computer 3",
      "_numberField1": 740,
      "_stringField3": "plug_01",
      "_stringField2": "Bedroom 2",
      "_numberField2": 160,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456541334,
    "_version": "707",
    "thingID": "th.ba28b2d34b60-18ab-6e11-743f-00536448"
  }, {
    "vendorThingID": "0009",
    "_owner": "201679bd29b199c5aab5eec8531bc319",
    "created": "2017-02-15T06:25:17.166Z",
    "_created": 1487148128924,
    "online": true,
    "disabled": false,
    "onlineStatusModifiedAt": "2017-03-14T01:55:43.769Z",
    "_id": "a308adc0-f35a-11e6-ba81-06b43d2b82ab",
    "fields": {
      "_layoutPosition": "END_NODE",
      "_stringField1": "Computer 4",
      "_numberField1": 520,
      "_stringField3": "plug_01",
      "_stringField2": "Bedroom 3",
      "_numberField2": 160,
      "_thingType": "EnergyNode"
    },
    "_modified": 1489456544001,
    "_version": "139",
    "thingID": "th.7c698b427320-e56a-6e11-743f-060a0748"
  }]
      }`;
      this.ownedThings = JSON.parse(body).results;
      deferred.resolve(this.ownedThings);
    });

    return deferred.promise;
  }

  protected bulkES() {
    this.getOwnedThings().then((ownedThings: KiiThing[]) => {
      console.log(_.find(ownedThings, { thingID: 'th.7c698b427320-e56a-6e11-743f-060a0748' }));
    });
  }

  protected gcByCounter() {
    if (!global.gc) return;
    if (this.counter < this.maxRequest) {
      this.counter++;
    } else {
      this.counter = 0;
      global.gc();
    }
  }

  protected gcByTime() {
    if (!global.gc) return;
    setInterval(() => {
      global.gc();
    }, 60000);
  }

  /**
   * onboard endnode with gateway by owner
   *
   * @abstract
   * @param {any} endNodeVendorThingID
   * @param {any} [properties]
   *
   * @memberOf KiiBase
   */
  abstract onboardEndnodeByOwner(endNodeVendorThingID: string, properties?: Object);


  /**
   * update endnode state
   *
   * @abstract
   * @param {any} endNodeThingID
   *
   * @memberOf KiiBase
   */
  abstract updateEndnodeState(endNode: EndNode);


  /**
   * update endnode connectivity
   *
   * @abstract
   * @param {string} endNodeThingID
   * @param {boolean} online
   *
   * @memberOf KiiBase
   */
  abstract updateEndnodeConnection(endNode: EndNode, online: boolean);
}
