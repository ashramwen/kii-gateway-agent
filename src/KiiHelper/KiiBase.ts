/// <reference types='node' />

import Q = require('q');
import request = require('request');
// import low = require('lowdb');

import { App, EndNode, Gateway, User } from '../model';

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

  constructor() {
    this.gateway = new Gateway();
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
        'content-type': 'application/vnd.kii.onboardingWithVendorThingIDByOwner+json'
      },
      body: JSON.stringify(body)
    };

    request(options, (error, response, body) => {
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
   * @param {any} states
   *
   * @memberOf KiiBase
   */
  abstract updateEndnodeState(endNode: EndNode, states: Object);


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
