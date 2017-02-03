export declare class EndNode {
    vendorThingID: string;
    thingID: string;
    accessToken: string;
    connection: boolean;
    type: string;
    password: string;
    lastUpdate: number;
    online: boolean;
    constructor(vendorThingID: any);
}
export declare type EndNodes = EndNode[];
