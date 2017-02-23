/// <reference types='node' />

import Q = require('q');
import request = require('request');
// import low = require('lowdb');

import { KiiBase } from './KiiBase';
import { App, EndNode, EndNodeBody, Gateway, User } from '../model';

export class KiiHelper extends KiiBase {

  private maxRequest: number = 10;
  private counter: number = 0;
  // private log;

  constructor() {
    super();
    console.log('running in Http mode.');
  }

  // onboard endnode with gateway by owner
  onboardEndnodeByOwner(endNodeVendorThingID, properties?) {
    let endnode = new EndNode(endNodeVendorThingID);
    let body: EndNodeBody = {
      endNodeVendorThingID: endnode.vendorThingID,
      endNodePassword: endnode.password,
      gatewayThingID: this.gateway.thingID,
      endNodeThingType: endnode.type,
      owner: `USER:${this.user.userID}`
    };
    if (properties) body.endNodeThingProperties = properties;

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
  updateEndnodeState(endnode, states) {
    let deferred = Q.defer();
    let options = {
      method: 'PUT',
      url: this.app.site + `/thing-if/apps/${this.app.appID}/targets/thing:${endnode.thingID}/states`,
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
  updateEndnodeConnection(endNode: EndNode, online: boolean) {
    let deferred = Q.defer();
    let options = {
      method: 'PUT',
      url: this.app.site + `/thing-if/apps/${this.app.appID}/things/${this.gateway.thingID}/end-nodes/${endNode.thingID}/connection`,
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

  private gcByCounter() {
    if (!global.gc) return;
    if (this.counter < this.maxRequest) return;
    this.counter = 0;
    // console.log('gc.');
    global.gc();
  }

  private gc() {
    if (global.gc) {
      // console.log('gc.');
      global.gc();
    }
  }
}
