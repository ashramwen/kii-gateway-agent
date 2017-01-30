/// <reference types="q" />
import Q = require('q');
import { EndNode } from './model/index';
import { KiiHelper } from './KiiHelper/KiiHelper';
declare class KiiGatewayAgent {
    static preinit(): void;
    kii: KiiHelper;
    db: any;
    constructor();
    setApp(_appID: string, _appKey: string, _site: string): void;
    setTemporaryApp(_appID: string, _appKey: string, _site: string): void;
    setUser(ownerToken: string, ownerID: string): void;
    setTemporaryUser(ownerToken: string, ownerID: string): void;
    onboardGatewayByOwner(properties?: any): Q.Promise<{}>;
    onboardEndnodeByOwner(endNodeVendorThingID: string, properties?: any): Q.Promise<{}>;
    updateEndnodeState(endNodeThingID: string, states?: any): Q.Promise<{}>;
    updateEndnodeConnectivity(endNodeThingID: string, online: boolean): Q.Promise<{}>;
    detectEndnodeOnboardingStatus(endNodeVendorThingID: string): EndNode;
}
export = KiiGatewayAgent;
