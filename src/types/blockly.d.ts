import * as Blockly from 'blockly';

declare global {
    interface Window {
        Blockly: typeof Blockly & {
            derivWorkspace: Blockly.WorkspaceSvg & {
                asyncClear: () => void;
                strategy_to_load: string;
                cleanUp: () => void;
                trashcan: {
                    setTrashcanPosition: (x: number, y: number) => void;
                    svgGroup?: SVGElement;
                };
            };
            Xml: typeof Blockly.Xml;
            utils: typeof Blockly.utils;
            Trashcan: {
                prototype: {
                    setTrashcanPosition: (x: number, y: number) => void;
                    click: () => void;
                };
            };
        };
    }
}

export {};
