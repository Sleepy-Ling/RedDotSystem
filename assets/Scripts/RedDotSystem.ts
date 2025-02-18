import { nanoid } from "nanoid";
import { TBDATA_RedDot } from "./TableData/TBDATA_RedDot";


/**红点检测函数 */
export type IRedDotCheckFunc = (...param: any) => number;

/**红点事件 */
export class RedDotEvent {
    public checkFunc: IRedDotCheckFunc;
    public target: any;
    id: string;

    constructor(checkFunc: IRedDotCheckFunc, target: any) {
        this.checkFunc = checkFunc;
        this.target = target;

        this.id = nanoid();
    }
}

/**注册的ui节点 */
export interface IUINode {
    /**根节点 */
    uiTrans: cc.Node;
    /**红点图片 */
    spr_redDot: cc.Node;

    lab_count: cc.Label;
}

export interface IRedDotNode {
    parent: IRedDotNode;
    id: string;
    child: Set<IRedDotNode>;
    isOn: boolean;
    name: string;

    uiNode: Array<IUINode>;

    count?: number;
}

class IPriorityNode {
    id: string;
    child: IPriorityNode[];
    constructor(id: string) {
        this.id = id;
        this.child = [];
    }
}

/**红点系统 */
class _RedDotSystem {
    private _redDotPool: cc.NodePool = new cc.NodePool();
    private _redDot: cc.Node;
    /**红点注册表 */
    private _registerMap: Map<string, IRedDotNode> = new Map();
    /**红点事件注册表 （针对无节点的红底事件或者事件驱动的红点）*/
    private _registerEventMap: Map<string, Array<RedDotEvent>> = new Map();
    /**事件检测间隔 */
    private _eventCheckInterval: number = 1000;
    /**事件序列号id （用于生成事件id） */
    protected event_serial_uid: number = 0;
    /**事件检测计时器 */
    private _eventCheckTimer: number;

    init(redDot: cc.Node) {
        // let node = new cc.Node("redDot");
        // let spr = node.addComponent(cc.Sprite);
        // spr.spriteFrame = redDot;
        // this._redDot = spr.node;
        this._redDot = redDot;

        // const uiEventDispatcher = GM.eventDispatcherManager.getEventDispatcher(Enum_EventType.UI);
        // uiEventDispatcher.Listen(CustomEvents.RedDotEvent, this.OnRedDotEvent, this);

        this._eventCheckTimer = setInterval(this._doEventCheck.bind(this), this._eventCheckInterval);

    }


    initRedDotTree(data: JSON, maxLayer: number = 4) {
        let tmpPriorityRoot: IPriorityNode = {
            id: "",
            child: []
        };

        //解析配置，划分红点层级关系
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                /**父节点 */
                let parent: IPriorityNode = tmpPriorityRoot;
                /**当前节点 */
                let priorityNode: IPriorityNode = null;

                const element = data[key] as TBDATA_RedDot;
                let order = element.priority.split('.');
                for (const o of order) {
                    let idx: number = Number(o);
                    priorityNode = parent.child[idx];

                    if (priorityNode == null) {
                        priorityNode = new IPriorityNode(key);

                        parent.child[idx] = priorityNode;
                    }

                    parent = priorityNode;
                }

                //当前红点
                let redDotNode: IRedDotNode = {
                    parent: undefined,
                    id: key,
                    child: new Set(),
                    isOn: false,
                    name: "",
                    uiNode: []
                }

                this._registerMap.set(key, redDotNode);
            }
        }


        console.log("root");

        console.log(tmpPriorityRoot);

        //初始化红点
        const redDotChildInit = (rdMap: Map<string, IRedDotNode>, curPriority: IPriorityNode, parent: IRedDotNode) => {
            if (curPriority == null) {
                return null;
            }

            let redDotNode = rdMap.get(curPriority.id);
            if (redDotNode == null) {
                return null;
            }

            redDotNode.parent = parent;

            for (let i = 0; i < curPriority.child.length; i++) {
                const element = curPriority.child[i];

                if (element == null) {
                    continue;
                }

                let child = redDotChildInit(rdMap, element, redDotNode);
                redDotNode.child.add(child);
            }

            return redDotNode;
        }

        for (const tmpPriorityNode of tmpPriorityRoot.child) {
            redDotChildInit(this._registerMap, tmpPriorityNode, null);
        }

        console.log("map ", this._registerMap);

    }

    private _doEventCheck() {
        const keys = Array.from(this._registerEventMap.keys());
        for (const k of keys) {
            this.doEventStateCheck(k);
        }

        this.RefreshAll();
    }

    /**
     * 动态添加红点
     * @param key 红点key
     * @param parentKey 父节点key
     * @returns 
     */
    public AddRedDotNode(key: string, parentKey: string = null) {
        if (this._registerMap.has(key)) {
            console.error("already has key ->", key);

            return false;
        }

        let parent = parentKey ? this._registerMap.get(parentKey) : null;

        //当前红点
        let redDotNode: IRedDotNode = {
            parent: parent,
            id: key,
            child: new Set(),
            isOn: false,
            name: "",
            uiNode: []
        }

        parent.child.add(redDotNode);

        this._registerMap.set(key, redDotNode);

        return true;

    }

    /**注册红点事件 */
    RegisterEvent(key: string, func: IRedDotCheckFunc, target: any) {
        if (func == null) {
            console.error("regis event is null");
            return null;
        }

        let redDotEventList: Array<RedDotEvent> = this._registerEventMap.get(key);

        let event: RedDotEvent;
        if (redDotEventList == null) {
            redDotEventList = [];

            this._registerEventMap.set(key, redDotEventList);
        }
        else {
            event = redDotEventList.find((event) => {
                return event.target == target && event.checkFunc == func;
            })
        }

        if (event) {
            console.error("regist same event");
            return null;
        }

        event = new RedDotEvent(func, target)

        redDotEventList.push(event);

        return event.id;
    }

    /**
     * 取消某个事件注册 根据id  (最好填上事件类型，不然全部检索一遍全部事件)
     * @param id 事件id
     * @param key 事件类型
     */
    UnRegisterEvent(id: string, key?: string) {
        if (key == null) {
            let keys = Array.from(this._registerEventMap.keys());

            for (const k of keys) {
                let eventList = this._registerEventMap.get(k);
                if (eventList == null) {
                    continue;
                }
                let idx = eventList.findIndex((rdEvent) => {
                    return rdEvent.id == id;
                })

                if (idx >= 0) {
                    eventList.splice(idx, 1);
                }

                this._registerEventMap.set(k, eventList);

                return true;
            }
        }
        else {
            let eventList: RedDotEvent[] = this._registerEventMap.get(key);
            if (eventList == null) {
                return false;
            }

            let idx = eventList.findIndex((rdEvent) => {
                return rdEvent.id == id;
            })


            if (idx >= 0) {
                eventList.splice(idx, 1);
            }

            this._registerEventMap.set(key, eventList);

            return true;
        }

        return false;
    }


    /**
     * 取消某个事件注册 根据作用域 (最好填上事件类型，不然全部检索一遍全部事件)
     * @param target 事件作用域
     * @param key 事件类型
     */
    UnRegisterEventByTarget(target: any, key?: string) {
        let isRegisterSucc: boolean = false;
        if (key == null) {
            let keys = Array.from(this._registerEventMap.keys());

            for (const k of keys) {
                let eventList = this._registerEventMap.get(k);
                if (eventList == null) {
                    continue;
                }

                for (let i = eventList.length; i > 0; i--) {
                    const rdEvent = eventList[i];
                    if (target == rdEvent.target) {
                        eventList.splice(i, 1);

                        if (!isRegisterSucc) {
                            isRegisterSucc = true;
                        }
                    }

                }

                this._registerEventMap.set(k, eventList);

            }
        }
        else {
            let eventList: RedDotEvent[] = this._registerEventMap.get(key);
            if (eventList == null) {
                return false;
            }

            for (let i = eventList.length; i > 0; i--) {
                const rdEvent = eventList[i];
                if (target == rdEvent.target) {
                    eventList.splice(i, 1);

                    if (!isRegisterSucc) {
                        isRegisterSucc = true;
                    }
                }

            }

            this._registerEventMap.set(key, eventList);
        }

        return isRegisterSucc;
    }

    /**
     * 注册节点
     * @param key 红点事件
     * @param node 节点
     */
    RegisterNode(key: string, node: cc.Node) {
        // console.log("RegisterNode", " key", key);

        let uiTrans: cc.Node = node;

        /**当前红点 */
        let redDotNode: IRedDotNode = this._registerMap.get(key);

        /**当前与该红点相关的ui节点数组 */
        let uiNodeList = redDotNode.uiNode;
        let idx: number = uiNodeList.findIndex((cur) => { return cur.uiTrans == uiTrans; });
        /**当前与该红点相关的ui节点 */
        let uiNode: IUINode;
        if (idx == null || idx < 0) {
            uiNode = {
                uiTrans: uiTrans,
                spr_redDot: null,
                lab_count: null,
            }

            uiNodeList.push(uiNode);

            return true;
        }

        return false;
    }

    /**取消注册节点 */
    UnRegisterNode(key: string, node: cc.Node) {
        // console.log("UnRegisterNode", " key", key, node);

        /**当前红点 */
        let redDotNode: IRedDotNode = this._registerMap.get(key);
        if (redDotNode) {

            let idx = redDotNode.uiNode.findIndex((curNode) => {
                return curNode.uiTrans == node;
            })

            if (idx >= 0) {
                let curDeleteRdNode = redDotNode.uiNode.splice(idx, 1)[0];
                this.recoverUINode(curDeleteRdNode);//回收一下红点节点

                return true;
            }

        }

        return false;
    }

    public setRedDotCount(key: string, count: number) {
        let rdNode = this._registerMap.get(key);
        if (!rdNode) {
            return false;
        }


        rdNode.count = count || 0;
        return true;
    }

    /**更新节点状态 */
    protected doEventStateCheck(key: string) {
        console.log("doEventStateCheck ==>", key);

        /**红点列表 */
        const redDotNode: IRedDotNode = this._registerMap.get(key);
        const eventList = this._registerEventMap.get(key);

        let now_isOn = false;
        // let now_cnt: number = 0;

        if (eventList) {
            now_isOn = eventList.some((v) => {
                return v.checkFunc.apply(v.target);
            })

            // for (const evt of eventList) {
            //     let cnt = evt.checkFunc.apply(evt.target);
            //     now_cnt += cnt;
            // }


        }

        let curChildList = Array.from(redDotNode.child);
        for (const child of curChildList) {
            now_isOn = child.isOn || now_isOn;

            // now_cnt += child.count || 0;
        }

        let last_isOn = redDotNode.isOn;
        redDotNode.isOn = now_isOn;

        if (redDotNode.parent && last_isOn != now_isOn) {
            this.doEventStateCheck(redDotNode.parent.id);
        }

        return now_isOn;
    }

    /**刷新节点 */
    protected refreshRedDot(RDNode: IRedDotNode, state: boolean) {
        if (state) {
            if (!RDNode.uiNode) {
                return;
            }

            for (const node of RDNode.uiNode) {
                if (node.spr_redDot == null) {
                    let redDot = this._redDotPool.get();
                    if (!redDot) {
                        redDot = cc.instantiate(this._redDot);
                    }
                    node.spr_redDot = redDot;
                    node.lab_count = redDot.getComponentInChildren(cc.Label);

                    redDot.setParent(node.uiTrans);
                    let contentSize: cc.Size = node.uiTrans.getContentSize();

                    redDot.setPosition(contentSize.width / 2, contentSize.height / 2);

                    // if (RDNode.count && node.lab_count) {
                    //     node.lab_count.string = RDNode.count.toString();
                    //     node.lab_count.node.active = RDNode.count > 0;
                    // }
                }
            }
        }
        else {
            for (const node of RDNode.uiNode) {
                this.recoverUINode(node);
            }
        }
    }

    /**
     * 刷新红点个数
     * @param RDNode 红点
     * @param count 个数
     */
    protected refreshRedDotCount(RDNode: IRedDotNode) {
        let count: number = 0;
        if (RDNode.count && RDNode.count > 0) {

            let childList = Array.from(RDNode.child);
            for (let i = 0; i < childList.length; i++) {
                const child = childList[i];
                count += this.refreshRedDotCount(child);
            }


            for (const node of RDNode.uiNode) {
                if (count > 0) {
                    node.lab_count.string = count.toString();
                    node.lab_count.node.active = RDNode.count > 0;
                }
            }
        }

        return count;
    }

    protected recoverUINode(uiNode: IUINode) {
        if (uiNode.spr_redDot == null) {
            return;
        }

        this._redDotPool.put(uiNode.spr_redDot);
        uiNode.lab_count = null;
        uiNode.spr_redDot = null;
    }

    /**刷新全部节点 */
    RefreshAll() {
        // for (let key in this._registerMap) {
        //     let node = this._registerMap.get(key);
        //     if (node.isOn) {
        //         console.log("red  ->", node.id);

        //     }

        //     this.refreshRedDot(node, node.isOn);
        // }

        this._registerMap.forEach((rdNode) => {
            if (rdNode.isOn) {
                console.log("red  ->", rdNode.id);
            }

            this.refreshRedDot(rdNode, rdNode.isOn);

            this.refreshRedDotCount(rdNode);
        })
    }
}

export const RedDotSystem = new _RedDotSystem();

