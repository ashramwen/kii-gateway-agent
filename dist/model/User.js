"use strict";
var User = (function () {
    function User(ownerToken, ownerID) {
        this.ownerToken = ownerToken;
        this.userID = ownerID;
    }
    return User;
}());
exports.User = User;
