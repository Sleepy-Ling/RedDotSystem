// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import { nanoid } from "nanoid";
import { RedDotSystem } from "./RedDotSystem";
import { Enum_RedDotID } from "./RedDotKey";

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

        //ui节点绑定指定事件
        RedDotSystem.RegisterNode(Enum_RedDotID.Lobby.toString(), btnMap["1-0"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.CharacterSystem.toString(), btnMap["1-1"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.CombatSystem.toString(), btnMap["1-2"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.SocialSystem.toString(), btnMap["1-3"]);

        RedDotSystem.RegisterNode(Enum_RedDotID.Task.toString(), btnMap["2-0"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.DailyTask.toString(), btnMap["4-0"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.WeeklyTask.toString(), btnMap["4-1"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.AchievementTask.toString(), btnMap["4-2"]);

        RedDotSystem.RegisterNode(Enum_RedDotID.AchievementSystem.toString(), btnMap["2-1"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.PersonalAchievement.toString(), btnMap["4-3"]);

        RedDotSystem.RegisterNode(Enum_RedDotID.ShopSystem.toString(), btnMap["2-2"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.SignInSystem.toString(), btnMap["2-3"]);

        RedDotSystem.RegisterNode(Enum_RedDotID.CharacterCreation.toString(), btnMap["3-0"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.CharacterLeveling.toString(), btnMap["3-1"]);
        RedDotSystem.RegisterNode(Enum_RedDotID.SkillSystem.toString(), btnMap["3-2"]);
        // RedDotSystem.RegisterNode(Enum_RedDotID.EquipmentSystem.toString(), btnMap["3-3"]);

        //注册红点相关事件
        RedDotSystem.RegisterEvent(Enum_RedDotID.Lobby.toString(), this.isBtnBusy, this, "1-0");
        RedDotSystem.RegisterEvent(Enum_RedDotID.CharacterSystem.toString(), this.isBtnBusy, this, "1-1");
        RedDotSystem.RegisterEvent(Enum_RedDotID.CombatSystem.toString(), this.isBtnBusy, this, "1-2");
        RedDotSystem.RegisterEvent(Enum_RedDotID.SocialSystem.toString(), this.isBtnBusy, this, "1-3");
        RedDotSystem.RegisterEvent(Enum_RedDotID.Task.toString(), this.isBtnBusy, this, "2-0");
        RedDotSystem.RegisterEvent(Enum_RedDotID.DailyTask.toString(), this.isBtnBusy, this, "4-0");
        RedDotSystem.RegisterEvent(Enum_RedDotID.WeeklyTask.toString(), this.isBtnBusy, this, "4-1");
        RedDotSystem.RegisterEvent(Enum_RedDotID.AchievementTask.toString(), this.isBtnBusy, this, "4-2");
        RedDotSystem.RegisterEvent(Enum_RedDotID.AchievementSystem.toString(), this.isBtnBusy, this, "2-1");
        RedDotSystem.RegisterEvent(Enum_RedDotID.PersonalAchievement.toString(), this.isBtnBusy, this, "4-3");
        RedDotSystem.RegisterEvent(Enum_RedDotID.ShopSystem.toString(), this.isBtnBusy, this, "2-2");
        RedDotSystem.RegisterEvent(Enum_RedDotID.SignInSystem.toString(), this.isBtnBusy, this, "2-3");
        RedDotSystem.RegisterEvent(Enum_RedDotID.CharacterCreation.toString(), this.isBtnBusy, this, "3-0");
        RedDotSystem.RegisterEvent(Enum_RedDotID.CharacterLeveling.toString(), this.isBtnBusy, this, "3-1");
        RedDotSystem.RegisterEvent(Enum_RedDotID.SkillSystem.toString(), this.isBtnBusy, this, "3-2");
        // RedDotSystem.RegisterEvent(Enum_RedDotID.EquipmentSystem.toString(), this.isBtnBusy, this, "3-3");

        //添加自定义红点事件
        RedDotSystem.AddRedDotNode("c_0", Enum_RedDotID.Lobby.toString());
        RedDotSystem.RegisterNode("c_0", btnMap["3-3"]);
        RedDotSystem.RegisterEvent("c_0", this.isBtnBusy, this, "3-3");

        setTimeout(() => {
            console.log("remove !!");

            RedDotSystem.removeRedDotNode("c_0");
            RedDotSystem.removeRedDotNode(Enum_RedDotID.Task.toString());
            RedDotSystem.UnRegisterEventByTarget(this, Enum_RedDotID.DailyTask.toString());

    }, 5000);

}

    protected onClickBtn(evt: cc.Event.EventMouse) {

    this.clickRecored;

    let name = evt.target.name;
    console.log("click btn -->", name);


    let s = this.clickRecored[name] || 0;

    let isLeft: boolean = evt.getButton() == 0;


    this.clickRecored[name] = isLeft ? s + 1 : s - 1;
}

    protected isBtnBusy(name: string) {
    // console.log("name", this.clickRecored[name]);

    return this.clickRecored[name];
}
}
