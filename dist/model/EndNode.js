"use strict";
var EndNode = (function () {
    function EndNode(vendorThingID) {
        this.type = 'EnergyNode';
        this.password = '12345';
        this.lastUpdate = new Date().valueOf();
        this.online = true;
        this.vendorThingID = vendorThingID;
    }
    return EndNode;
}());
exports.EndNode = EndNode;
var EndNodeBody = (function () {
    function EndNodeBody(endnode, gatewayThingID, userID, properties) {
        this.endNodeVendorThingID = endnode.vendorThingID;
        this.endNodePassword = endnode.password;
        this.gatewayThingID = gatewayThingID;
        this.endNodeThingType = endnode.type;
        this.owner = "USER:" + userID;
        if (properties)
            this.endNodeThingProperties = properties;
    }
    return EndNodeBody;
}());
exports.EndNodeBody = EndNodeBody;
