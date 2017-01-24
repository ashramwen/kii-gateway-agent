export class User {
  userID: string;
  ownerToken: string;

  constructor(ownerToken, ownerID) {
    this.ownerToken = ownerToken;
    this.userID = ownerID;
  }
}
