// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { nanoid } from "nanoid";
import { RedDotSystem } from "./RedDotSystem";

const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {
    @property(cc.Node)
    redDot: cc.Node = null;
    @property(cc.JsonAsset)
    json: cc.JsonAsset = null;

    clickRecored: Record<string, number> = {};
    start() {
        RedDotSystem.init(this.redDot);

        RedDotSystem.initRedDotTree(this.json.json);

        let btnMap: Record<string, cc.Node> = {};

        let layouts = this.node.getComponentsInChildren(cc.Layout);
        for (let i = 0; i < layouts.length; i++) {
            const layout = layouts[i];

            let btns = layout.getComponentsInChildren(cc.Button);
            for (let j = 0; j < btns.length; j++) {
                const btn = btns[j];
                btn.node.name = `${layout.node.name}-${j}`;

                btn.node.on(cc.Node.EventType.MOUSE_UP, this.onClickBtn, this);
                console.log(btn.node.name);
                btn.getComponentInChildren(cc.Label).string = btn.node.name;
                btnMap[btn.node.name] = btn.node;
            }
        }

        RedDotSystem.AddRedDotNode("c_0", "9");
        RedDotSystem.AddRedDotNode("c_1", "9");
        RedDotSystem.AddRedDotNode("c_2", "9");

        RedDotSystem.RegisterNode("1", btnMap["1-0"]);
        RedDotSystem.RegisterNode("2", btnMap["2-0"]);
        RedDotSystem.RegisterNode("6", btnMap["2-1"]);
        RedDotSystem.RegisterNode("9", btnMap["2-2"]);

        RedDotSystem.RegisterNode("7", btnMap["4-1"]);
        RedDotSystem.RegisterNode("8", btnMap["4-2"]);

        RedDotSystem.RegisterNode("3", btnMap["4-0"]);
        // RedDotSystem.RegisterNode("4", btnMap["4-1"]);
        // RedDotSystem.RegisterNode("5", btnMap["4-2"]);

        RedDotSystem.RegisterNode("17", btnMap["1-1"]);
        RedDotSystem.RegisterNode("22", btnMap["1-2"]);
        RedDotSystem.RegisterNode("26", btnMap["1-3"]);

        RedDotSystem.RegisterNode("c_0", btnMap["3-0"]);
        RedDotSystem.RegisterNode("c_1", btnMap["3-1"]);
        RedDotSystem.RegisterNode("c_2", btnMap["3-2"]);

        RedDotSystem.RegisterEvent("3", this.isBtnBusy.bind(this, "4-0"), this);
        RedDotSystem.RegisterEvent("7", this.isBtnBusy.bind(this, "4-1"), this);
        RedDotSystem.RegisterEvent("8", this.isBtnBusy.bind(this, "4-2"), this);

        RedDotSystem.RegisterEvent("c_0", this.isBtnBusy.bind(this, "3-0"), this);
        RedDotSystem.RegisterEvent("c_1", this.isBtnBusy.bind(this, "3-1"), this);
        RedDotSystem.RegisterEvent("c_2", this.isBtnBusy.bind(this, "3-2"), this);

        RedDotSystem.setRedDotCount("c_0", 5);
    }

    protected onClickBtn(evt: cc.Event.EventMouse) {

        this.clickRecored;

        let name = evt.target.name;
        console.log(evt.getButton());

        let s = this.clickRecored[name] || 0;

        let isLeft: boolean = evt.getButton() == 0;


        this.clickRecored[name] = isLeft ? s + 1 : s - 1;
    }

    protected isBtnBusy(name: string) {
        console.log("name", this.clickRecored[name]);

        return this.clickRecored[name] > 0;
    }
}
