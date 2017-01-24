"use strict";
var EndNode = (function () {
    function EndNode(vendorThingID) {
        this.type = 'EnergyNodey';
        this.password = '12345';
        this.vendorThingID = vendorThingID;
    }
    return EndNode;
}());
exports.EndNode = EndNode;
