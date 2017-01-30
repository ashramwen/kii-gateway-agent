"use strict";
var Q = require("q");
var low = require("lowdb");
var init_1 = require("./init");
var KiiHelper_1 = require("./KiiHelper/KiiHelper");
var KiiGatewayAgent = (function () {
    function KiiGatewayAgent() {
        init_1.init();
        this.db = new low('./resource/db.json');
    }
    KiiGatewayAgent.prototype.init = function (_appID, _appKey, _site) {
        this.kii = new KiiHelper_1.KiiHelper(_appID, _appKey, _site);
        this.db.set('app', this.kii.app).value();
    };
    KiiGatewayAgent.prototype.setUser = function (ownerToken, ownerID) {
        this.kii.setUser(ownerToken, ownerID);
        this.db.set('user', this.kii.user).value();
    };
    KiiGatewayAgent.prototype.onboardGatewayByOwner = function (properties) {
        var _this = this;
        var deferred = Q.defer();
        this.kii.onboardGatewayByOwner(properties).then(function (gateway) {
            _this.db.set('gateway', gateway).value();
            deferred.resolve(gateway);
        }, function (error) { return deferred.reject(new Error(error)); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var _this = this;
        var local_endnode = this.detectEndnodeOnboardingStatus(endNodeVendorThingID);
        var deferred = Q.defer();
        this.kii.onboardEndnodeByOwner(endNodeVendorThingID, properties).then(function (endnode) {
            if (local_endnode) {
                _this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).value();
            }
            else {
                _this.db.get('endNodes').push(endnode).value();
            }
            deferred.resolve(endnode);
        }, function (error) { return deferred.reject(new Error(error)); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeState = function (endNodeThingID, states) {
        var deferred = Q.defer();
        this.kii.updateEndnodeState(endNodeThingID, states).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(new Error(error)); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeConnectivity = function (endNodeThingID, online) {
        var deferred = Q.defer();
        this.kii.updateEndnodeConnectivity(endNodeThingID, online).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(new Error(error)); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.detectEndnodeOnboardingStatus = function (endNodeVendorThingID) {
        return this.db.get('endNodes').find({ vendorThingID: endNodeVendorThingID }).value();
    };
    return KiiGatewayAgent;
}());
module.exports = KiiGatewayAgent;
