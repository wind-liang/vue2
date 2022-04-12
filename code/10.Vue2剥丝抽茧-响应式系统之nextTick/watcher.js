import { pushTarget, popTarget } from "./dep";
import { queueWatcher } from "./scheduler";
let uid = 0;

export default class Watcher {
    constructor(Fn, options) {
        this.getter = Fn;
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        this.id = ++uid; // uid for batching
        // options
        if (options) {
            this.sync = !!options.sync;
        }
        this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call();
        } catch (e) {
            throw e;
        } finally {
            popTarget();
            this.cleanupDeps();
        }
        return value;
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
        const id = dep.id;
        // 新的依赖已经存在的话，同样不需要继续保存
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
    }

    /**
     * Clean up for dependency collection.
     */
    cleanupDeps() {
        let i = this.deps.length;
        // 比对新旧列表，找到旧列表里有，但新列表里没有，来移除相应 Watcher
        while (i--) {
            const dep = this.deps[i];
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this);
            }
        }

        // 新的列表赋值给旧的，新的列表清空
        let tmp = this.depIds;
        this.depIds = this.newDepIds;
        this.newDepIds = tmp;
        this.newDepIds.clear();
        tmp = this.deps;
        this.deps = this.newDeps;
        this.newDeps = tmp;
        this.newDeps.length = 0;
    }
    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    update() {
        if (this.sync) {
            this.run();
        } else {
            queueWatcher(this);
        }
    }

    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
    run() {
        this.get();
    }
}
