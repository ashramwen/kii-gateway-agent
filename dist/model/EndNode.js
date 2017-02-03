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
