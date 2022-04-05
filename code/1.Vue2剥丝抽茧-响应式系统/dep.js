export default class Dep {
    static target; //当前在执行的函数
    subs; // 依赖的函数
    constructor() {
        this.subs = []; // 保存所有需要执行的函数
    }

    addSub(sub) {
        this.subs.push(sub);
    }

    depend() {
        if (Dep.target) {
            // 委托给 Dep.target 去调用 addSub
            Dep.target.addDep(this);
        }
    }

    notify() {
        for (let i = 0, l = this.subs.length; i < l; i++) {
            this.subs[i].update();
        }
    }
}

Dep.target = null; // 静态变量，全局唯一
