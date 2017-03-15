"use strict";
var ESNode = (function () {
    function ESNode() {
    }
    ESNode.parse = function (endnode) {
        var node = new ESNode();
        node.thingID = endnode.thingID;
        node.timeStamp = new Date(endnode.state.Timestamp).toISOString();
        node.state = endnode.state;
        delete node.state.Timestamp;
        delete node.state.deviceID;
        return node;
    };
    return ESNode;
}());
exports.ESNode = ESNode;
