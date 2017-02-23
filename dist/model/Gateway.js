"use strict";
var macaddress = require("macaddress");
var Gateway = (function () {
    function Gateway() {
        var _this = this;
        this.type = 'EnergyGateway';
        this.password = '12345';
        macaddress.one(function (err, mac) {
            _this.vendorThingID = mac.replace(/:/g, '');
        });
    }
    return Gateway;
}());
exports.Gateway = Gateway;
var MqttEndpoint = (function () {
    function MqttEndpoint() {
    }
    return MqttEndpoint;
}());
exports.MqttEndpoint = MqttEndpoint;
