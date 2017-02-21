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
  setApp(_appID, _appKey, _site) {
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
  setUser(ownerToken, ownerID) {
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
  abstract onboardGatewayByOwner(properties?);


  /**
   * onboard endnode with gateway by owner
   *
   * @abstract
   * @param {any} endNodeVendorThingID
   * @param {any} [properties]
   *
   * @memberOf KiiBase
   */
  abstract onboardEndnodeByOwner(endNodeVendorThingID, properties?);


  /**
   * update endnode state
   *
   * @abstract
   * @param {any} endNodeThingID
   * @param {any} states
   *
   * @memberOf KiiBase
   */
  abstract updateEndnodeState(endNodeThingID, states);


  /**
   * update endnode connectivity
   *
   * @abstract
   * @param {string} endNodeThingID
   * @param {boolean} online
   *
   * @memberOf KiiBase
   */
  abstract updateEndnodeConnectivity(endNodeThingID: string, online: boolean);

  /**
   * set times of max request
   *
   * @abstract
   * @param {number} times
   *
   * @memberOf KiiBase
   */
  abstract setCounter(times: number);
}
