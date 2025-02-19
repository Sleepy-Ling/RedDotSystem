import { nanoid } from "nanoid";
import { TBDATA_RedDot } from "./TableData/TBDATA_RedDot";


/**红点检测函数 */
export type IRedDotCheckFunc = (...param: any) => number;

/**红点事件 */
export class RedDotEvent {
    public checkFunc: IRedDotCheckFunc;
    public target: any;
    public param: unknown[];
    id: string;

    constructor(checkFunc: IRedDotCheckFunc, target: any, param: unknown[]) {
        this.checkFunc = checkFunc;
        this.target = target;
        this.param = param;

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

    protected _root: IRedDotNode;

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
        let root: IRedDotNode = {
            parent: undefined,
            id: "",
            child: new Set(),
            isOn: false,
            name: "",
            uiNode: []
        }

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
            if (tmpPriorityNode) {
                redDotChildInit(this._registerMap, tmpPriorityNode, root);

                root.child.add(this._registerMap.get(tmpPriorityNode.id));
            }
        }

        this._root = root;

        console.log("map ", this._registerMap);

    }

    private _doEventCheck() {
        const keys = Array.from(this._registerEventMap.keys());
        for (const k of keys) {
            // this.doEventStateCheck(k);
            this.doEventCountCheck(k);
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

    /**
     * 移除某个类型的红点
     * @param key 类型
     * @param isAutoRemoveEvent 是否自动移除相关的全部事件(默认是)
     * @returns 
     */
    public removeRedDotNode(key: string, isAutoRemoveEvent: boolean = true) {
        if (!this._registerMap.has(key)) {
            console.error("do not have key ->", key);

            return false;
        }

        let rdNode = this._registerMap.get(key);
        for (const uiNode of rdNode.uiNode) {
            this.recoverUINode(uiNode);
        }

        let parentNode = rdNode.parent;
        rdNode.parent = null;
        rdNode.child.clear();
        rdNode.child = null;
        parentNode.child.delete(rdNode);
        this._registerMap.delete(key);
        
        if (isAutoRemoveEvent) {
            this._registerEventMap.delete(key);
        }

        return true;
    }

    /**注册红点事件 */
    RegisterEvent(key: string, func: IRedDotCheckFunc, target: any, ...param: unknown[]) {
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

        event = new RedDotEvent(func, target, param);

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
     * @param key 指定事件类型 （该值为空，则有关于target的全部事件都取消）
     */
    UnRegisterEventByTarget(target: any, key?: string) {
        let isUnRegisterSucc: boolean = false;
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

                        if (!isUnRegisterSucc) {
                            isUnRegisterSucc = true;
                        }
                    }

                }

            }
        }
        else {
            let eventList: RedDotEvent[] = this._registerEventMap.get(key);
            if (eventList == null) {
                return false;
            }

            for (let i = eventList.length - 1; i >= 0; i--) {
                const rdEvent = eventList[i];
                if (target == rdEvent.target) {
                    eventList.splice(i, 1);

                    if (!isUnRegisterSucc) {
                        isUnRegisterSucc = true;
                    }
                }

            }

            this._registerEventMap.set(key, eventList);
        }

        return isUnRegisterSucc;
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

    protected doEventCountCheck(key: string) {
        /**红点列表 */
        const redDotNode: IRedDotNode = this._registerMap.get(key);
        if (!redDotNode) {
            return;
        }

        const eventList = this._registerEventMap.get(key);

        let now_cnt: number = 0;

        if (eventList) {
            for (const evt of eventList) {
                let cnt = evt.checkFunc.apply(evt.target, evt.param);
                cnt = cnt < 0 ? 0 : cnt;
                now_cnt += cnt || 0;
            }
        }

        redDotNode.count = now_cnt;
    }

    /**刷新节点 */
    protected setRedDotState(RDNode: IRedDotNode, state: boolean, count: number) {
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

                    redDot.setParent(node.uiTrans);
                    let contentSize: cc.Size = node.uiTrans.getContentSize();

                    redDot.setPosition(contentSize.width / 2, contentSize.height / 2);
                }
                else {
                    let redDot = node.spr_redDot;

                    if (!node.lab_count) {
                        node.lab_count = redDot.getComponentInChildren(cc.Label);
                    }

                    if (node.lab_count) {
                        node.lab_count.string = count.toString();
                        node.lab_count.node.active = count > 0;
                    }

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
        let count: number = RDNode.count || 0;

        let childList = Array.from(RDNode.child);
        for (let i = 0; i < childList.length; i++) {
            const child = childList[i];
            count += this.refreshRedDotCount(child);
        }

        // console.log(RDNode.id, " count ", count);

        let isOn = count > 0;
        RDNode.isOn = isOn;

        this.setRedDotState(RDNode, isOn, count);

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
        // this._registerMap.forEach((rdNode) => {
        //     if (rdNode.isOn) {
        //         console.log("red  ->", rdNode.id);
        //     }

        //     this.refreshRedDot(rdNode, rdNode.isOn);

        // })

        this.refreshRedDotCount(this._root);

    }
}

export const RedDotSystem = new _RedDotSystem();

