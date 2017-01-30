/// <reference types="q" />
import Q = require('q');
import { App, Gateway, User } from '../model';
export declare class KiiHelper {
    app: App;
    user: User;
    gateway: Gateway;
    constructor();
    setApp(_appID: any, _appKey: any, _site: any): void;
    setUser(ownerToken: any, ownerID: any): void;
    onboardGatewayByOwner(properties?: any): Q.Promise<{}>;
    onboardEndnodeByOwner(endNodeVendorThingID: any, properties?: any): Q.Promise<{}>;
    updateEndnodeState(endNodeThingID: any, states: any): Q.Promise<{}>;
    updateEndnodeConnectivity(endNodeThingID: string, online: boolean): Q.Promise<{}>;
}
