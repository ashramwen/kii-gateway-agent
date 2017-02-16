/// <reference types='node' />

import Q = require('q');
import request = require('request');
// import low = require('lowdb');

import { App, EndNode, Gateway, User } from '../model';

export class KiiHelper {

  app: App;
  user: User;
  gateway: Gateway;
  // private log;

  constructor() {
    this.gateway = new Gateway();
    // let today = new Date();
    // let day = today.getDate();
    // let month = today.getMonth() + 1;
    // let year = today.getFullYear();
  }

  setApp(_appID, _appKey, _site) {
    this.app = new App(_appID, _appKey, _site);
  }

  setUser(ownerToken, ownerID) {
    this.user = new User(ownerToken, ownerID);
  }

  // onboard gateway by owner
  onboardGatewayByOwner(properties?) {
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

  // onboard endnode with gateway by owner
  onboardEndnodeByOwner(endNodeVendorThingID, properties?) {
    let endnode = new EndNode(endNodeVendorThingID);
    let body = {
      'endNodeVendorThingID': endnode.vendorThingID,
      'endNodePassword': endnode.password,
      'gatewayThingID': this.gateway.thingID,
      'endNodeThingType': endnode.type,
      'owner': `USER:${this.user.userID}`
    };
    if (properties) body['endNodeThingProperties'] = properties;

    let deferred = Q.defer();
    let options = {
      method: 'POST',
      url: `${this.app.site}/thing-if/apps/${this.app.appID}/onboardings`,
      headers: {
        authorization: `Bearer ${this.user.ownerToken}`,
        'content-type': 'application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json'
      },
      body: JSON.stringify(body)
    };

    request(options, (error, response, body) => {
      this.gc();
      if (error) deferred.reject(new Error(error));
      body = JSON.parse(body);
      endnode.thingID = body.endNodeThingID;
      endnode.accessToken = body.accessToken;
      deferred.resolve(endnode);
    });

    return deferred.promise;
  }

  // update endnode state
  updateEndnodeState(endNodeThingID, states) {
    let deferred = Q.defer();
    let options = {
      method: 'PUT',
      url: this.app.site + `/thing-if/apps/${this.app.appID}/targets/thing:${endNodeThingID}/states`,
      headers: {
        authorization: `Bearer ${this.user.ownerToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(states)
    };
    request(options, (error, response, body) => {
      this.gc();
      if (response && response.statusCode === 204) {
        deferred.resolve(response.statusCode);
      }
      if (error) {
        deferred.reject(new Error(error));
      };
      deferred.reject(body);
    });
    return deferred.promise;
  }

  // update endnode connectivity
  updateEndnodeConnectivity(endNodeThingID: string, online: boolean) {
    let deferred = Q.defer();
    let options = {
      method: 'PUT',
      url: this.app.site + `/thing-if/apps/${this.app.appID}/things/${this.gateway.thingID}/end-nodes/${endNodeThingID}/connection`,
      headers: {
        authorization: `Bearer ${this.user.ownerToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        'online': online
      })
    };
    request(options, (error, response, body) => {
      this.gc();
      if (response && response.statusCode === 204) {
        deferred.resolve(response.statusCode);
      }
      if (error) {
        deferred.reject(new Error(error));
      };
      deferred.reject(body);
    });
    return deferred.promise;
  }

  private gc() {
    if (global.gc) {
      global.gc();
    }
  }
}
