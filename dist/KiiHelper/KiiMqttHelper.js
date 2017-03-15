"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require("q");
var Paho = require('../mqtt/mqttws31');
var KiiBase_1 = require("./KiiBase");
var model_1 = require("../model");
var KiiMqttHelper = (function (_super) {
    __extends(KiiMqttHelper, _super);
    function KiiMqttHelper() {
        var _this = _super.call(this) || this;
        console.log('running in MQTT mode.');
        _this.gcByTime();
        return _this;
    }
    KiiMqttHelper.prototype.onboardGatewayByOwner = function (properties) {
        var _this = this;
        var deferred = Q.defer();
        _super.prototype.onboardGatewayByOwner.call(this, properties).then(function (res) {
            _this.connectMqtt(deferred);
        }, function (err) { return deferred.reject(err); });
        return deferred.promise;
    };
    KiiMqttHelper.prototype.onboardEndnodeByOwner = function (endNodeVendorThingID, properties) {
        var _this = this;
        var deferred = Q.defer();
        var endnode = new model_1.EndNode(endNodeVendorThingID);
        var body = new model_1.EndNodeBody(endnode, this.gateway.thingID, this.user.userID, properties);
        var local_endnode = this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).value();
        if (local_endnode) {
            this.db.get('endNodes').find({ 'vendorThingID': endNodeVendorThingID }).assign(endnode).write();
        }
        else {
            try {
                this.db.get('endNodes').push(endnode).write();
            }
            catch (err) {
                console.log(err);
            }
        }
        setTimeout(function () {
            var onboardingMessage = 'POST\n';
            onboardingMessage += 'Content-type:application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json\n';
            onboardingMessage += "Authorization:Bearer " + _this.user.ownerToken + "\n";
            onboardingMessage += "X-Kii-RequestID:" + endNodeVendorThingID + " onboardings\n";
            onboardingMessage += '\n';
            onboardingMessage += JSON.stringify(body);
            var topic = "p/" + _this.gateway.mqttEndpoint.mqttTopic + "/thing-if/apps/" + _this.app.appID + "/onboardings";
            _this.sendMessage(topic, onboardingMessage);
            deferred.resolve(endnode);
        }, 1000);
        return deferred.promise;
    };
    KiiMqttHelper.prototype.updateEndnodeState = function (endnode) {
        var deferred = Q.defer();
        if (this.client.isConnected) {
            this.bulkES();
            var onboardingMessage = 'PUT\n';
            onboardingMessage += 'Content-type:application/json\n';
            onboardingMessage += "Authorization:Bearer " + this.user.ownerToken + "\n";
            onboardingMessage += "X-Kii-RequestID:" + endnode.vendorThingID + " updateState\n";
            onboardingMessage += '\n';
            onboardingMessage += JSON.stringify(endnode.state);
            var topic = "p/" + this.gateway.mqttEndpoint.mqttTopic + "/thing-if/apps/" + this.app.appID + "/targets/THING:" + endnode.thingID + "/states";
            this.sendMessage(topic, onboardingMessage);
        }
        else {
            this.cacheStates(endnode);
        }
        deferred.resolve();
        return deferred.promise;
    };
    KiiMqttHelper.prototype.updateEndnodeConnection = function (endnode, online) {
        var deferred = Q.defer();
        var onboardingMessage = 'PUT\n';
        onboardingMessage += 'Content-type:application/json\n';
        onboardingMessage += "Authorization:Bearer " + this.user.ownerToken + "\n";
        onboardingMessage += "X-Kii-RequestID:" + endnode.vendorThingID + " updateConnection\n";
        onboardingMessage += '\n';
        onboardingMessage += JSON.stringify({ 'online': online });
        var topic = "p/" + this.gateway.mqttEndpoint.mqttTopic + "/thing-if/apps/" + this.app.appID + "/things/" + this.gateway.thingID + "/end-nodes/" + endnode.thingID + "/connection";
        this.sendMessage(topic, onboardingMessage);
        deferred.resolve();
        return deferred.promise;
    };
    KiiMqttHelper.prototype.connectMqtt = function (deferred) {
        var _this = this;
        var mqtt = this.gateway.mqttEndpoint;
        var endpoint = "wss://" + mqtt.host + ":" + mqtt.portWSS + "/mqtt";
        this.client = new Paho.MQTT.Client(endpoint, mqtt.mqttTopic);
        this.client.onConnectionLost = this.onConnectionLost.bind(this);
        this.client.onMessageArrived = this.onMessageArrived.bind(this);
        this.client.connect({
            onSuccess: function () {
                console.log('MQTT Connected');
                _this.client.subscribe(mqtt.mqttTopic);
                if (deferred)
                    deferred.resolve(_this.gateway);
            },
            userName: mqtt.username,
            password: mqtt.password,
        });
    };
    KiiMqttHelper.prototype.onConnectionLost = function (responseObject) {
        console.log('MQTT Connection Lost:', responseObject.errorMessage);
        console.log('MQTT reconnecting.');
        this.connectMqtt();
    };
    KiiMqttHelper.prototype.onMessageArrived = function (message) {
        var payload = this.parseResponse(message.payloadString);
        if (payload.statusCode > 299) {
            console.log("MQTT Error: " + payload.requestID + " " + payload.type);
            return;
        }
        switch (payload.type) {
            case 'onboardings':
                console.log("MQTT Onboarding: " + payload.requestID);
                var endnode = this.db.get('endNodes').find({ vendorThingID: payload.requestID }).value();
                endnode.thingID = payload.body.endNodeThingID;
                endnode.accessToken = payload.body.accessToken;
                endnode.online = true;
                this.db.get('endNodes').find({ 'vendorThingID': payload.requestID }).assign(endnode).write();
                this.updateEndnodeConnection(endnode, true);
                break;
        }
    };
    KiiMqttHelper.prototype.sendMessage = function (topic, message) {
        var _message = new Paho.MQTT.Message(message);
        _message.destinationName = topic;
        this.client.send(_message);
    };
    KiiMqttHelper.prototype.parseResponse = function (payloadString) {
        var codeReg = /^(\d{3})/;
        var requestReg = /X-Kii-RequestID:([^\n]*)/;
        var bodyReg = /(\{[^}]*\})/;
        var payload = new Payload();
        payload.statusCode = +codeReg.exec(payloadString)[1];
        var requestID = requestReg.exec(payloadString)[1].split(' ');
        payload.requestID = requestID[0];
        payload.type = requestID[1].replace('\r', '');
        var m;
        if ((m = bodyReg.exec(payloadString)) !== null) {
            payload.body = JSON.parse(m[1]);
        }
        return payload;
    };
    return KiiMqttHelper;
}(KiiBase_1.KiiBase));
exports.KiiMqttHelper = KiiMqttHelper;
var Payload = (function () {
    function Payload() {
    }
    return Payload;
}());
