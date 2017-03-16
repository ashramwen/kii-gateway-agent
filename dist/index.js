"use strict";
var _1 = require("./KiiHelper/");
var Q = require("q");
var low = require("lowdb");
var fs = require("fs");
var TIMESPAN = 300000;
var KiiGatewayAgent = (function () {
    function KiiGatewayAgent() {
        KiiGatewayAgent.preinit();
        this.isHttp = process.argv.indexOf('--mqtt') < 0;
        if (this.isHttp)
            this.kii = new _1.KiiHelper();
        else {
            this.kii = new _1.KiiMqttHelper();
        }
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
        }).write();
    };
    KiiGatewayAgent.prototype.setApp = function (_appID, _appKey, _site) {
        this.setTemporaryApp(_appID, _appKey, _site);
        this.db.set('app', this.kii.app).value();
    };
    KiiGatewayAgent.prototype.setTemporaryApp = function (_appID, _appKey, _site) {
        this.kii.setApp(_appID, _appKey, _site);
    };
    KiiGatewayAgent.prototype.setUser = function (ownerToken, userID) {
        this.setTemporaryUser(ownerToken, userID);
        this.db.set('user', this.kii.user).value();
    };
    KiiGatewayAgent.prototype.setTemporaryUser = function (ownerToken, userID) {
        this.kii.setUser(ownerToken, userID);
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
    KiiGatewayAgent.prototype.loadGatewaySetting = function () {
        var deferred = Q.defer();
        this.kii.gateway = this.db.get('gateway').value();
        deferred.resolve(this.kii.gateway);
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.isGatewayOnboarding = function () {
        return !!this.kii.gateway.thingID;
    };
    KiiGatewayAgent.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var _this = this;
        var local_endnode = this.getEndnode(endNodeVendorThingID);
        var deferred = Q.defer();
        var p = this.kii.onboardEndnodeByOwner(endNodeVendorThingID, properties);
        p.then(function (endnode) {
            if (_this.isHttp) {
                if (local_endnode) {
                    _this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).write();
                }
                else {
                    _this.db.get('endNodes').push(endnode).write();
                }
                _this.kii.updateEndnodeConnection(endnode, true);
            }
            deferred.resolve(endnode);
        }, function (error) { return deferred.reject(error); });
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeState = function (endnode, states) {
        var _this = this;
        endnode.state = states;
        var deferred = Q.defer();
        endnode.lastUpdate = new Date().valueOf();
        if (endnode.online) {
            this.kii.updateEndnodeState(endnode).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
        }
        else {
            endnode.online = true;
            this.kii.updateEndnodeConnection(endnode, true).then(function (res) {
                _this.kii.updateEndnodeState(endnode).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
            }, function (error) { deferred.reject(error); });
        }
        this.db.get('endNodes').find({ 'vendorThingID': endnode.vendorThingID }).assign(endnode).write();
        return deferred.promise;
    };
    KiiGatewayAgent.prototype.updateEndnodeConnectivityByVendorThingID = function (endNodeVendorThingID, online) {
        var node = this.getEndnode(endNodeVendorThingID);
        var deferred = Q.defer();
        if (node) {
            this.kii.updateEndnodeConnection(node, online).then(function (res) { return deferred.resolve(res); }, function (error) { return deferred.reject(error); });
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
            var promise = this_1.kii.updateEndnodeConnection(endnode, false);
            promise.then(function (res) {
                endnode.online = false;
                _this.db.get('endNodes').find({ 'vendorThingID': endnode.vendorThingID }).assign(endnode).write();
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
