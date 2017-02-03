/// <reference types="q" />
import Q = require('q');
import { EndNode } from './model/index';
import { KiiHelper } from './KiiHelper/KiiHelper';
declare class KiiGatewayAgent {
    static preinit(): void;
    kii: KiiHelper;
    db: any;
    private timer;
    constructor();
    setApp(_appID: string, _appKey: string, _site: string): void;
    setTemporaryApp(_appID: string, _appKey: string, _site: string): void;
    setUser(ownerToken: string, ownerID: string): void;
    setTemporaryUser(ownerToken: string, ownerID: string): void;
    onboardGatewayByOwner(properties?: any): Q.Promise<{}>;
    isGatewayOnboarding(): boolean;
    onboardEndnodeByOwner(endNodeVendorThingID: string, properties?: any): Q.Promise<{}>;
    updateEndnodeState(endNodeVendorThingID: string, states?: any): Q.Promise<{}>;
    updateEndnodeConnectivityByThingID(endNodeThingID: string, online: boolean): Q.Promise<{}>;
    updateEndnodeConnectivityByVendorThingID(endNodeVendorThingID: string, online: boolean): Q.Promise<{}>;
    getEndnode(endNodeVendorThingID: string): EndNode;
    updateEndnodeOnline(): Q.Promise<{}>;
    activateEndnodeOnlineDetecting(active: boolean): void;
}
export = KiiGatewayAgent;
