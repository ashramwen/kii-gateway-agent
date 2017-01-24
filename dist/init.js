"use strict";
var low = require("lowdb");
var fs = require("fs");
var dir = './resource';
function init() {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    var db = new low('./resource/db.json');
    db.defaults({ app: {}, user: {}, gateway: {}, endNodes: [] }).value();
}
exports.init = init;
init();
