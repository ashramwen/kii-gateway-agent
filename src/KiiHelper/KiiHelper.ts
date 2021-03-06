/// <reference types='node' />

import Q = require('q');
import request = require('request');
// import low = require('lowdb');

import { KiiBase } from './KiiBase';
import { App, EndNode, EndNodeBody, Gateway, User } from '../model';

export class KiiHelper extends KiiBase {

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
        'content-type': 'application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json',
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
      endnode.thingID = body.endNodeThingID;
      endnode.accessToken = body.accessToken;
      deferred.resolve(endnode);
    });

    return deferred.promise;
  }

  // update endnode state
  updateEndnodeState(endnode: EndNode) {
    let deferred = Q.defer();
    let options = {
      method: 'PUT',
      url: this.app.site + `/thing-if/apps/${this.app.appID}/targets/thing:${endnode.thingID}/states`,
      headers: {
        authorization: `Bearer ${this.user.ownerToken}`,
        'content-type': 'application/json',
        'Connection': 'keep-alive'
      },
      agentOptions: {
        ciphers: 'DES-CBC3-SHA'
      },
      body: JSON.stringify(endnode.state)
    };
    request(options, (error, response, body) => {
      this.gcByCounter();
      if (response && response.statusCode === 204) {
        this.bulkES();
        deferred.resolve(response.statusCode);
        return;
      }
      this.cacheStates(endnode);
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
        'content-type': 'application/json',
        'Connection': 'keep-alive'
      },
      agentOptions: {
        ciphers: 'DES-CBC3-SHA'
      },
      body: JSON.stringify({
        'online': online
      })
    };
    request(options, (error, response, body) => {
      this.gcByCounter();
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
}
