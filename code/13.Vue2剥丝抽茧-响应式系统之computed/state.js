import Watcher from "./watcher";
import { isPlainObject, noop } from "./util";
import Dep from "./dep";

export function initWatch(data, watch) {
    for (const key in watch) {
        const handler = watch[key];
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
                createWatcher(data, key, handler[i]);
            }
        } else {
            createWatcher(data, key, handler);
        }
    }
}

function createWatcher(data, expOrFn, handler, options) {
    if (isPlainObject(handler)) {
        options = handler;
        handler = handler.handler;
    }
    return $watch(data, expOrFn, handler, options);
}

function $watch(data, expOrFn, handler, options) {
    const watcher = new Watcher(data, expOrFn, handler, options);
    if (options.immediate) {
        handler.call(data, watcher.value);
    }
    return function unwatchFn() {
        watcher.teardown();
    };
}

const computedWatcherOptions = { lazy: true };

// computed properties are just getters during SSR
export function initComputed(data, computed) {
    const watchers = (data._computedWatchers = Object.create(null));

    for (const key in computed) {
        const userDef = computed[key];
        const getter = typeof userDef === "function" ? userDef : userDef.get;
        // create internal watcher for the computed property.
        watchers[key] = new Watcher(
            data,
            getter || noop,
            noop,
            computedWatcherOptions
        );

        // component-defined computed properties are already defined on the
        // component prototype. We only need to define computed properties defined
        // at instantiation here.
        defineComputed(data, key, userDef);
    }
}
const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop,
};
export function defineComputed(target, key, userDef) {
    if (typeof userDef === "function") {
        sharedPropertyDefinition.get = createComputedGetter(key);
        sharedPropertyDefinition.set = noop;
    } else {
        sharedPropertyDefinition.get = userDef.get
            ? createComputedGetter(key)
            : noop;
        sharedPropertyDefinition.set = userDef.set || noop;
    }
    Object.defineProperty(target, key, sharedPropertyDefinition);
}

function createComputedGetter(key) {
    return function computedGetter() {
        const watcher = this._computedWatchers && this._computedWatchers[key];
        if (watcher) {
            if (watcher.dirty) {
                watcher.evaluate();
            }
            if (Dep.target) {
                watcher.depend();
            }
            return watcher.value;
        }
    };
}
