import { remove } from "../util";

let uid = 0;

export default class Dep {
    static target; //当前在执行的函数
    subs; // 依赖的函数
    id; // Dep 对象标识
    constructor() {
        this.id = uid++;
        this.subs = []; // 保存所有需要执行的函数
    }

    addSub(sub) {
        this.subs.push(sub);
    }

    removeSub(sub) {
        remove(this.subs, sub);
    }
    depend() {
        if (Dep.target) {
            // 委托给 Dep.target 去调用 addSub
            Dep.target.addDep(this);
        }
    }

    notify() {
        // stabilize the subscriber list first
        const subs = this.subs.slice();
        for (let i = 0, l = subs.length; i < l; i++) {
            subs[i].update();
        }
    }
}

Dep.target = null; // 静态变量，全局唯一

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
const targetStack = [];

export function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target;
}

export function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1];
}
