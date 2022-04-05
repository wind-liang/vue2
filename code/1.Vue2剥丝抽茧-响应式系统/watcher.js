import Dep from "./dep";
export default class Watcher {
    constructor(Fn) {
        this.getter = Fn;
        this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        Dep.target = this; // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call();
        } catch (e) {
            throw e;
        }
        return value;
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
        // 当前正在执行的函数的 Watcher 保存到 dep 中的 subs 中
        dep.addSub(this);
    }

    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    update() {
        this.run();
    }

    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
    run() {
        this.get();
    }
}
