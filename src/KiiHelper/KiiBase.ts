/// <reference types='node' />

import Q = require('q');
import low = require('lowdb');
import request = require('request');
import _ = require('lodash');

import { App, EndNode, ESNode, Gateway, KiiThing, User } from '../model';

const bulkUrl = 'http://121.199.7.69:9200/_bulk';

/**
 * KiiBase
 *
 * @export
 * @abstract
 * @class KiiBase
 */
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
  private cacheState: any;
  private lastBulk: number;

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
    this.cache.defaults({ bulkAPI: bulkUrl, states: [] }).write();
    this.cacheState = this.cache.get('states');
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
      this.ownedThings = JSON.parse(body).results;
      deferred.resolve(this.ownedThings);
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
   *　upload lots of data to ES with bulk API
   *
   *
   * @memberOf KiiBase
   */
  public bulkES() {
    try {
      if (!this.cacheState.size().value()) return;
      if (!this.validateBulkTime()) return;
      console.log('ES Bulk.');
      this.getOwnedThings().then(() => {
        let data = this.traverseCacheState();
        return this.callESBulkApi(data);
      }).then(() => {
        this.cache.set('states', []).write();
      });
    }
    catch (err) {
      console.log('Bulk Error:', err);
    }
  }

  private validateBulkTime(): boolean {
    if (this.lastBulk) {
      if (new Date().valueOf() > (this.lastBulk + 60000)) {
        this.lastBulk = new Date().valueOf();
        return true;
      }
      return false;
    }
    this.lastBulk = new Date().valueOf();
    return true;
  }

  /**
   * traverse each CacheState
   *
   * @private
   * @returns {string} es-formatted data
   *
   * @memberOf KiiBase
   */
  private traverseCacheState(): string {
    let ret: string = '';
    this.cacheState.value().forEach(o => {
      let kiiThing = this.getField(o.thingID);
      o.cache.forEach((esnode: ESNode) => {
        ret += this.generateESFormat(esnode, kiiThing.fields);
      });
    });
    return ret;
  }

  /**
   * get the fields of the thing
   *
   * @private
   * @param {string} thingID
   * @returns {KiiThing}
   *
   * @memberOf KiiBase
   */
  private getField(thingID): KiiThing {
    return _.find(this.ownedThings, (o => o.thingID === thingID));
  }

  /**
   * generate ES well-formed data
   *
   * @private
   * @param {KiiThing} kiiThing
   * @param {*} fields
   * @returns
   *
   * @memberOf KiiBase
   */
  private generateESFormat(esnode: ESNode, fields: any) {
    let str = { create: { _index: this.app.appID, _type: 'states' } };
    esnode.fields = fields;
    return `${JSON.stringify(str)}
${JSON.stringify(esnode)}
`;
  }

  private callESBulkApi(data: string) {
    let deferred = Q.defer();
    let options = {
      method: 'POST',
      url: this.cache.get('bulkAPI').value() || bulkUrl,
      headers: {
        Authorization: 'Bearer super_token',
        Connection: 'keep-alive'
      },
      body: data
    };

    request(options, (error, response, body) => {
      this.gcByCounter();
      if (error) deferred.reject(new Error(error));
      deferred.resolve();
    });

    return deferred.promise;
  }

  /**
   * gc by count
   *
   * @protected
   * @returns
   *
   * @memberOf KiiBase
   */
  protected gcByCounter() {
    if (!global.gc) return;
    if (this.counter < this.maxRequest) {
      this.counter++;
    } else {
      this.counter = 0;
      global.gc();
    }
  }

  /**
   * gc by time
   *
   * @protected
   * @returns
   *
   * @memberOf KiiBase
   */
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
