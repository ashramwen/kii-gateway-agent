"use strict";
var Q = require("q");
var low = require("lowdb");
var fs = require("fs");
var KiiHelper_1 = require("./KiiHelper/KiiHelper");
var TIMESPAN = 300000;
var KiiGatewayAgent = (function () {
    function KiiGatewayAgent() {
        KiiGatewayAgent.preinit();
        this.kii = new KiiHelper_1.KiiHelper();
        this.db = new low('./resource/db.json');
        this.kii.app = this.db.get('app').value();
        this.kii.user = this.db.get('user').value();
    }
    KiiGatewayAgent.preinit = function () {
        var dir = './resource';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        var db = new low('./resource/db.json');
        db.defaults({
            app: {
                'appID': 'appID',
                'appKey': 'appKey',
                'site': 'https://api-sg.kii.com'
            }, user: {
                'ownerToken': 'ownerToken',
                'userID': 'userID'
            }, gateway: {}, endNodes: []
        }).value();
    };
    KiiGatewayAgent.prototype.setApp = function (_appID, _appKey, _site) {
        this.setTemporaryApp(_appID, _appKey, _site);
        this.db.set('app', this.kii.app).value();
    };
    KiiGatewayAgent.prototype.setTemporaryApp = function (_appID, _appKey, _site) {
        this.kii.setApp(_appID, _appKey, _site);
    };
    KiiGatewayAgent.prototype.setUser = function (ownerToken, ownerID) {
        this.setTemporaryUser(ownerToken, ownerID);
        this.db.set('user', this.kii.user).value();
    };
    KiiGatewayAgent.prototype.setTemporaryUser = function (ownerToken, ownerID) {
        this.kii.setUser(ownerToken, ownerID);
    };
    KiiGatewayAgent.prototype.onboardGatewayByOwner = function (properties) {
        var _this = this;
        var deferred = Q.defer();
        this.kii.onboardGatewayByOwner(properties).then(function (gateway) {
            _this.db.set('gateway', gateway).value();
            deferred.resolve(gateway);
        }, function (error) { return deferred.reject(error); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.isGatewayOnboarding = function () {
        return !!this.kii.gateway.thingID;
    };
    KiiGatewayAgent.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var _this = this;
        var local_endnode = this.getEndnode(endNodeVendorThingID);
        var deferred = Q.defer();
        this.kii.onboardEndnodeByOwner(endNodeVendorThingID, properties).then(function (endnode) {
            if (local_endnode) {
                _this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).value();
            }
            else {
                _this.db.get('endNodes').push(endnode).value();
            }
            deferred.resolve(endnode);
        }, function (error) { return deferred.reject(error); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeState = function (endNodeVendorThingID, states) {
        var _this = this;
        var deferred = Q.defer();
        var endnode = this.getEndnode(endNodeVendorThingID);
        endnode.lastUpdate = new Date().valueOf();
        if (endnode.online) {
            this.kii.updateEndnodeState(endnode.thingID, states).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
        }
        else {
            endnode.online = true;
            this.updateEndnodeConnectivityByThingID(endnode.thingID, true).then(function (res) {
                _this.kii.updateEndnodeState(endnode.thingID, states).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
            }, function (error) { deferred.reject(error); });
        }
        this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).value();
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeConnectivityByThingID = function (endNodeThingID, online) {
        var deferred = Q.defer();
        this.kii.updateEndnodeConnectivity(endNodeThingID, online).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeConnectivityByVendorThingID = function (endNodeVendorThingID, online) {
        var node = this.getEndnode(endNodeVendorThingID);
        var deferred = Q.defer();
        if (node) {
            this.updateEndnodeConnectivityByThingID(node.thingID, online).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
        }
        else {
            deferred.reject(new Error('endnode not found.'));
        }
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.getEndnode = function (endNodeVendorThingID) {
        return this.db.get('endNodes').find({ vendorThingID: endNodeVendorThingID }).value();
    };
    KiiGatewayAgent.prototype.updateEndnodeOnline = function () {
        var _this = this;
        var deferred = Q.defer();
        var promises = [];
        var endnodes = this.db.get('endNodes').value();
        var now = new Date().valueOf();
        var _loop_1 = function (endnode) {
            if (!endnode.online)
                return "continue";
            if (now - endnode.lastUpdate < TIMESPAN)
                return "continue";
            var promise = this_1.updateEndnodeConnectivityByThingID(endnode.thingID, false);
            promise.then(function (res) {
                endnode.online = false;
                _this.db.get('endNodes').find({ 'vendorThingID': endnode.vendorThingID }).assign(endnode).value();
            }, function (err) { return console.log(err); });
            promises.push(promise);
        };
        var this_1 = this;
        for (var _i = 0, endnodes_1 = endnodes; _i < endnodes_1.length; _i++) {
            var endnode = endnodes_1[_i];
            _loop_1(endnode);
        }
        Q.allSettled(promises).then(function (results) {
            deferred.resolve(results);
        });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.activateEndnodeOnlineDetecting = function (active) {
        var _this = this;
        if (active) {
            if (this.timer)
                return;
            this.timer = setTimeout(function () { _this.updateEndnodeOnline(); }, TIMESPAN);
        }
        else {
            if (!this.timer)
                return;
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    };
    return KiiGatewayAgent;
}());
module.exports = KiiGatewayAgent;
