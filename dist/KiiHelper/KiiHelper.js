"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require("q");
var request = require("request");
var KiiBase_1 = require("./KiiBase");
var model_1 = require("../model");
var KiiHelper = (function (_super) {
    __extends(KiiHelper, _super);
    function KiiHelper() {
        var _this = _super.call(this) || this;
        console.log('running in Http mode.');
        return _this;
    }
    KiiHelper.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var _this = this;
        var endnode = new model_1.EndNode(endNodeVendorThingID);
        var body = {
            endNodeVendorThingID: endnode.vendorThingID,
            endNodePassword: endnode.password,
            gatewayThingID: this.gateway.thingID,
            endNodeThingType: endnode.type,
            owner: "USER:" + this.user.userID
        };
        if (properties)
            body.endNodeThingProperties = properties;
        var deferred = Q.defer();
        var options = {
            method: 'POST',
            url: this.app.site + "/thing-if/apps/" + this.app.appID + "/onboardings",
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json'
            },
            body: JSON.stringify(body)
        };
        request(options, function (error, response, body) {
            _this.gcByCounter();
            if (error)
                deferred.reject(new Error(error));
            body = JSON.parse(body);
            endnode.thingID = body.endNodeThingID;
            endnode.accessToken = body.accessToken;
            deferred.resolve(endnode);
        });
        return deferred.promise;
    };
    KiiHelper.prototype.updateEndnodeState = function (endnode, states) {
        var _this = this;
        var deferred = Q.defer();
        var options = {
            method: 'PUT',
            url: this.app.site + ("/thing-if/apps/" + this.app.appID + "/targets/thing:" + endnode.thingID + "/states"),
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify(states)
        };
        request(options, function (error, response, body) {
            _this.gcByCounter();
            if (response && response.statusCode === 204) {
                deferred.resolve(response.statusCode);
            }
            if (error) {
                deferred.reject(new Error(error));
            }
            ;
            deferred.reject(body);
        });
        return deferred.promise;
    };
    KiiHelper.prototype.updateEndnodeConnection = function (endNode, online) {
        var _this = this;
        var deferred = Q.defer();
        var options = {
            method: 'PUT',
            url: this.app.site + ("/thing-if/apps/" + this.app.appID + "/things/" + this.gateway.thingID + "/end-nodes/" + endNode.thingID + "/connection"),
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                'online': online
            })
        };
        request(options, function (error, response, body) {
            _this.gcByCounter();
            if (response && response.statusCode === 204) {
                deferred.resolve(response.statusCode);
            }
            if (error) {
                deferred.reject(new Error(error));
            }
            ;
            deferred.reject(body);
        });
        return deferred.promise;
    };
    return KiiHelper;
}(KiiBase_1.KiiBase));
exports.KiiHelper = KiiHelper;
