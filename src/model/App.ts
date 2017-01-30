export class App {
  appID: string;
  appKey: string;
  site: string;
  constructor(appID?: string, appKey?: string, site?: string) {
    this.appID = appID;
    this.appKey = appKey;
    this.site = site;
  }
}
