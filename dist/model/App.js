"use strict";
var App = (function () {
    function App(appID, appKey, site) {
        this.appID = appID;
        this.appKey = appKey;
        this.site = site;
    }
    return App;
}());
exports.App = App;
