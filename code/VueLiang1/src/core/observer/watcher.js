import { pushTarget, popTarget } from "./dep";
import { queueWatcher } from "./scheduler";
import { parsePath } from "../util";
import { traverse } from "./traverse";

let uid = 0;

export default class Watcher {
    constructor(vm, expOrFn, cb, options) {
        this.vm = vm;
        if (typeof expOrFn === "function") {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        this.id = ++uid; // uid for batching
        this.cb = cb;
        // options
        if (options) {
            this.deep = !!options.deep;
            this.sync = !!options.sync;
            this.lazy = !!options.lazy;
        }
        this.dirty = this.lazy;
        this.value = this.lazy ? undefined : this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call(this.vm, this.vm);
        } catch (e) {
            throw e;
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value);
            }
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
        if (this.lazy) {
            this.dirty = true;
        } else if (this.sync) {
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
        const value = this.get();
        if (value !== this.value || this.deep) {
            // set new value
            const oldValue = this.value;
            this.value = value;
            this.cb.call(this.vm, value, oldValue);
        }
    }

    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    evaluate() {
        this.value = this.get();
        this.dirty = false;
    }
    /**
     * Depend on all deps collected by this watcher.
     */
    depend() {
        let i = this.deps.length;
        while (i--) {
            this.deps[i].depend();
        }
    }
}
