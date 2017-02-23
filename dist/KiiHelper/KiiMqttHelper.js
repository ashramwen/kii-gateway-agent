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
        var deferred = Q.defer();
        var endnode = new model_1.EndNode(endNodeVendorThingID);
        var body = new model_1.EndNodeBody(endnode, this.gateway.thingID, this.user.userID, properties);
        var onboardingMessage = 'POST\n';
        onboardingMessage += 'Content-type:application/vnd.kii.OnboardingEndNodeWithGatewayThingID+json\n';
        onboardingMessage += "Authorization:Bearer " + this.user.ownerToken + "\n";
        onboardingMessage += "X-Kii-RequestID:" + endNodeVendorThingID + " onboarding\n";
        onboardingMessage += '\n';
        onboardingMessage += JSON.stringify(body);
        var topic = "p/" + this.gateway.mqttEndpoint.mqttTopic + "/thing-if/apps/" + this.app.appID + "/onboardings";
        this.sendMessage(topic, onboardingMessage);
        deferred.resolve();
        return deferred.promise;
    };
    KiiMqttHelper.prototype.updateEndnodeState = function (endnode, states) {
        var deferred = Q.defer();
        var onboardingMessage = 'PUT\n';
        onboardingMessage += 'Content-type:application/json\n';
        onboardingMessage += "Authorization:Bearer " + this.user.ownerToken + "\n";
        onboardingMessage += "X-Kii-RequestID:" + endnode.vendorThingID + " update state\n";
        onboardingMessage += '\n';
        onboardingMessage += JSON.stringify(states);
        var topic = "p/" + this.gateway.mqttEndpoint.mqttTopic + "/thing-if/apps/" + this.app.appID + "/targets/THING:" + endnode.thingID + "/states";
        this.sendMessage(topic, onboardingMessage);
        deferred.resolve();
        return deferred.promise;
    };
    KiiMqttHelper.prototype.updateEndnodeConnection = function (endnode, online) {
        var deferred = Q.defer();
        var onboardingMessage = 'PUT\n';
        onboardingMessage += 'Content-type:application/json\n';
        onboardingMessage += "Authorization:Bearer " + this.user.ownerToken + "\n";
        onboardingMessage += "X-Kii-RequestID:" + endnode.vendorThingID + " update connection\n";
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
        this.client.onConnectionLost = this.onConnectionLost;
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
    };
    KiiMqttHelper.prototype.onMessageArrived = function (message) {
        var payload = message.payloadString.split('\n');
        if (+payload[0] > 299) {
            var requestID = this.find(payload, 'X-Kii-RequestID:');
            var msg = +payload[0] + requestID.replace('X-Kii-RequestID:', ' ');
            console.log('MQTT Message Arrived:', msg);
        }
    };
    KiiMqttHelper.prototype.sendMessage = function (topic, message) {
        var _message = new Paho.MQTT.Message(message);
        _message.destinationName = topic;
        this.client.send(_message);
    };
    KiiMqttHelper.prototype.startsWith = function (source, searchString) {
        return source.substr(0, searchString.length) === searchString;
    };
    KiiMqttHelper.prototype.find = function (_array, predicate) {
        var _this = this;
        var ret;
        _array.forEach(function (s) {
            if (_this.startsWith(s, predicate))
                ret = s;
        });
        return ret;
    };
    return KiiMqttHelper;
}(KiiBase_1.KiiBase));
exports.KiiMqttHelper = KiiMqttHelper;
