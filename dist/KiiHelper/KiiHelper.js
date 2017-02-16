"use strict";
var Q = require("q");
var request = require("request");
var model_1 = require("../model");
var KiiHelper = (function () {
    function KiiHelper() {
        this.gateway = new model_1.Gateway();
    }
    KiiHelper.prototype.setApp = function (_appID, _appKey, _site) {
        this.app = new model_1.App(_appID, _appKey, _site);
    };
    KiiHelper.prototype.setUser = function (ownerToken, ownerID) {
        this.user = new model_1.User(ownerToken, ownerID);
    };
    KiiHelper.prototype.onboardGatewayByOwner = function (properties) {
        var _this = this;
        var body = {
            'vendorThingID': this.gateway.vendorThingID,
            'thingPassword': this.gateway.password,
            'thingType': this.gateway.type,
            'owner': "USER:" + this.user.userID,
            'layoutPosition': 'GATEWAY'
        };
        if (properties)
            body['thingProperties'] = properties;
        var deferred = Q.defer();
        var options = {
            method: 'POST',
            url: this.app.site + "/thing-if/apps/" + this.app.appID + "/onboardings",
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/vnd.kii.onboardingWithVendorThingIDByOwner+json'
            },
            body: JSON.stringify(body)
        };
        request(options, function (error, response, body) {
            if (error)
                deferred.reject(new Error(error));
            body = JSON.parse(body);
            _this.gateway.thingID = body.thingID;
            _this.gateway.accessToken = body.accessToken;
            _this.gateway.mqttEndpoint = body.mqttEndpoint;
            deferred.resolve(_this.gateway);
        });
        return deferred.promise;
    };
    KiiHelper.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var endnode = new model_1.EndNode(endNodeVendorThingID);
        var body = {
            'endNodeVendorThingID': endnode.vendorThingID,
            'endNodePassword': endnode.password,
            'gatewayThingID': this.gateway.thingID,
            'endNodeThingType': endnode.type,
            'owner': "USER:" + this.user.userID
        };
        if (properties)
            body['endNodeThingProperties'] = properties;
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
            if (error)
                deferred.reject(new Error(error));
            body = JSON.parse(body);
            endnode.thingID = body.endNodeThingID;
            endnode.accessToken = body.accessToken;
            deferred.resolve(endnode);
        });
        return deferred.promise;
    };
    KiiHelper.prototype.updateEndnodeState = function (endNodeThingID, states) {
        var deferred = Q.defer();
        var options = {
            method: 'PUT',
            url: this.app.site + ("/thing-if/apps/" + this.app.appID + "/targets/thing:" + endNodeThingID + "/states"),
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify(states)
        };
        request(options, function (error, response, body) {
            if (global.gc) {
                global.gc();
            }
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
    KiiHelper.prototype.updateEndnodeConnectivity = function (endNodeThingID, online) {
        var deferred = Q.defer();
        var options = {
            method: 'PUT',
            url: this.app.site + ("/thing-if/apps/" + this.app.appID + "/things/" + this.gateway.thingID + "/end-nodes/" + endNodeThingID + "/connection"),
            headers: {
                authorization: "Bearer " + this.user.ownerToken,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                'online': online
            })
        };
        request(options, function (error, response, body) {
            if (global.gc) {
                global.gc();
            }
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
}());
exports.KiiHelper = KiiHelper;
