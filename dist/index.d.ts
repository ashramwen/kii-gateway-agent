import { EndNode } from './model/index';
import { KiiHelper } from './KiiHelper/KiiHelper';
export declare class KiiGatewayAgent {
    kii: KiiHelper;
    db: any;
    constructor();
    init(_appID: string, _appKey: string, _site: any): void;
    setUser(ownerToken: string, ownerID: string): void;
    onboardGatewayByOwner(properties?: any): any;
    onboardEndnodeByOwner(endNodeVendorThingID: string, properties?: any): any;
    updateEndnodeState(endNodeThingID: string, states: any): any;
    updateEndnodeConnectivity(endNodeThingID: string, online: boolean): any;
    detectEndnodeOnboardingStatus(endNodeVendorThingID: string): EndNode;
}
