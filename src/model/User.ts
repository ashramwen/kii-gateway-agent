export class User {
  userID: string;
  ownerToken: string;

  constructor(ownerToken: string, ownerID: string) {
    this.ownerToken = ownerToken;
    this.userID = ownerID;
  }
}
