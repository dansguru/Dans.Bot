export type TBlocklyEvents = {
    type: string;
    element: string;
    group: string;
    oldValue: string;
    blockId: string;
};

declare module 'blockly' {
    interface Blockly {
        derivWorkspace: {
            trashcan: {
                setTrashcanPosition: (x: number, y: number) => void;
            };
            isFlyoutVisible: boolean;
        };
    }
}
