import { App, Gateway, User } from '../model';
export declare class KiiHelper {
    app: App;
    user: User;
    gateway: Gateway;
    constructor(_appID: any, _appKey: any, _site: any);
    setUser(ownerToken: any, ownerID: any): void;
    onboardGatewayByOwner(properties?: any): any;
    onboardEndnodeByOwner(endNodeVendorThingID: any, properties?: any): any;
    updateEndnodeState(endNodeThingID: any, states: any): any;
    updateEndnodeConnectivity(endNodeThingID: string, online: boolean): any;
}
