"use strict";
var Q = require("q");
var low = require("lowdb");
var request = require("request");
var _ = require("lodash");
var model_1 = require("../model");
var bulkUrl = 'http://121.199.7.69:9200/_bulk';
var KiiBase = (function () {
    function KiiBase() {
        this.db = new low('./resource/db.json');
        this.cache = new low('./resource/stateCache.json');
        this.counter = 0;
        this.maxRequest = 10;
        if (global.gc)
            console.log('gc mode enables.');
        this.gateway = new model_1.Gateway();
        this.cache.defaults({ bulkAPI: bulkUrl, states: [] }).write();
        this.cacheState = this.cache.get('states');
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
                'content-type': 'application/vnd.kii.onboardingWithVendorThingIDByOwner+json',
                'Connection': 'keep-alive'
            },
            agentOptions: {
                ciphers: 'DES-CBC3-SHA'
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
    KiiBase.prototype.getOwnedThings = function () {
        var _this = this;
        var deferred = Q.defer();
        var options = {
            method: 'POST',
            url: this.app.site + "/api/apps/" + this.app.appID + "/users/" + this.user.userID + "/buckets/OWNED_THINGS/query",
            headers: {
                Authorization: "Bearer " + this.user.ownerToken,
                'Content-Type': 'application/vnd.kii.QueryRequest+json',
                'Connection': 'keep-alive'
            },
            agentOptions: {
                ciphers: 'DES-CBC3-SHA'
            },
            body: JSON.stringify({
                'bucketQuery': {
                    'clause': {
                        'type': 'all'
                    }
                }
            })
        };
        request(options, function (error, response, body) {
            _this.gcByCounter();
            if (error)
                deferred.reject(new Error(error));
            _this.ownedThings = JSON.parse(body).results;
            deferred.resolve(_this.ownedThings);
        });
        return deferred.promise;
    };
    KiiBase.prototype.cacheStates = function (endnode) {
        var esnode = model_1.ESNode.parse(endnode);
        var record = this.cache.get('states').find({ thingID: endnode.thingID });
        if (record.value()) {
            record.get('cache').push(esnode).write();
        }
        else {
            this.cache.get('states').push({
                thingID: endnode.thingID,
                cache: [esnode]
            }).write();
        }
    };
    KiiBase.prototype.bulkES = function () {
        var _this = this;
        try {
            if (!this.cacheState.size().value())
                return;
            if (!this.validateBulkTime())
                return;
            console.log('ES Bulk.');
            this.getOwnedThings().then(function () {
                var data = _this.traverseCacheState();
                return _this.callESBulkApi(data);
            }).then(function () {
                _this.cache.set('states', []).write();
            });
        }
        catch (err) {
            console.log('Bulk Error:', err);
        }
    };
    KiiBase.prototype.validateBulkTime = function () {
        if (this.lastBulk) {
            if (new Date().valueOf() > (this.lastBulk + 60000)) {
                this.lastBulk = new Date().valueOf();
                return true;
            }
            return false;
        }
        this.lastBulk = new Date().valueOf();
        return false;
    };
    KiiBase.prototype.traverseCacheState = function () {
        var _this = this;
        var ret = '';
        this.cacheState.value().forEach(function (o) {
            var kiiThing = _this.getField(o.thingID);
            o.cache.forEach(function (esnode) {
                ret += _this.generateESFormat(esnode, kiiThing.fields);
            });
        });
        return ret;
    };
    KiiBase.prototype.getField = function (thingID) {
        return _.find(this.ownedThings, (function (o) { return o.thingID === thingID; }));
    };
    KiiBase.prototype.generateESFormat = function (esnode, fields) {
        var str = { create: { _index: this.app.appID, _type: 'states' } };
        esnode.fields = fields;
        return JSON.stringify(str) + "\n" + JSON.stringify(esnode) + "\n";
    };
    KiiBase.prototype.callESBulkApi = function (data) {
        var _this = this;
        var deferred = Q.defer();
        var options = {
            method: 'POST',
            url: this.cache.get('bulkAPI').value() || bulkUrl,
            headers: {
                Authorization: 'Bearer super_token',
                Connection: 'keep-alive'
            },
            body: data
        };
        request(options, function (error, response, body) {
            _this.gcByCounter();
            if (error)
                deferred.reject(new Error(error));
            deferred.resolve();
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
