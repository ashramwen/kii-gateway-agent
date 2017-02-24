"use strict";
var Q = require("q");
var request = require("request");
var model_1 = require("../model");
var KiiBase = (function () {
    function KiiBase() {
        this.counter = 0;
        this.maxRequest = 10;
        if (global.gc)
            console.log('gc mode.');
        this.gateway = new model_1.Gateway();
    }
    KiiBase.prototype.setApp = function (_appID, _appKey, _site) {
        this.app = new model_1.App(_appID, _appKey, _site);
    };
    KiiBase.prototype.setUser = function (ownerToken, ownerID) {
        this.user = new model_1.User(ownerToken, ownerID);
    };
    KiiBase.prototype.today = function () {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth() + 1;
        var year = today.getFullYear();
        return "" + year + month + day;
    };
    KiiBase.prototype.onboardGatewayByOwner = function (properties) {
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
            _this.gcByCounter();
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
    KiiBase.prototype.gcByCounter = function () {
        if (!global.gc)
            return;
        if (this.counter < this.maxRequest) {
            this.counter++;
        }
        else {
            this.counter = 0;
            global.gc();
        }
    };
    KiiBase.prototype.gcByTime = function () {
        if (!global.gc)
            return;
        setInterval(function () {
            global.gc();
        }, 60000);
    };
    return KiiBase;
}());
exports.KiiBase = KiiBase;
