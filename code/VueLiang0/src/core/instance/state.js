import Watcher from "../observer/watcher";
import Dep, { pushTarget, popTarget } from "../observer/dep";

import { set, del, observe, defineReactive } from "../observer/index";

import { bind, noop, hasOwn, isReserved, isPlainObject } from "../util/index";

const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop,
};

export function proxy(target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key];
    };
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val;
    };
    Object.defineProperty(target, key, sharedPropertyDefinition);
}

export function initState(vm) {
    const opts = vm.$options;
    if (opts.methods) initMethods(vm, opts.methods);
    if (opts.data) {
        initData(vm);
    } else {
        observe((vm._data = {}));
    }
    if (opts.computed) initComputed(vm, opts.computed);
    if (opts.watch) {
        initWatch(vm, opts.watch);
    }
}

function initData(vm) {
    let data = vm.$options.data;
    data = vm._data =
        typeof data === "function" ? getData(data, vm) : data || {};
    if (!isPlainObject(data)) {
        data = {};
    }
    // proxy data on instance
    const keys = Object.keys(data);
    const props = vm.$options.props;
    const methods = vm.$options.methods;
    let i = keys.length;
    while (i--) {
        const key = keys[i];
        if (process.env.NODE_ENV !== "production") {
            if (methods && hasOwn(methods, key)) {
                console.warn(
                    `Method "${key}" has already been defined as a data property.`,
                    vm
                );
            }
        }
        if (props && hasOwn(props, key)) {
            process.env.NODE_ENV !== "production" &&
                console.warn(
                    `The data property "${key}" is already declared as a prop. ` +
                        `Use prop default value instead.`,
                    vm
                );
        } else if (!isReserved(key)) {
            proxy(vm, `_data`, key);
        }
    }
    observe(data);
}

export function getData(data, vm) {
    // #7573 disable dep collection when invoking data getters
    pushTarget();
    try {
        return data.call(vm, vm);
    } catch (e) {
        handleError(e, vm, `data()`);
        return {};
    } finally {
        popTarget();
    }
}

const computedWatcherOptions = { lazy: true };

// computed properties are just getters during SSR
export function initComputed(vm, computed) {
    const watchers = (vm._computedWatchers = Object.create(null));

    for (const key in computed) {
        const userDef = computed[key];
        const getter = typeof userDef === "function" ? userDef : userDef.get;
        // create internal watcher for the computed property.
        watchers[key] = new Watcher(
            vm,
            getter || noop,
            noop,
            computedWatcherOptions
        );

        // component-defined computed properties are already defined on the
        // component prototype. We only need to define computed properties defined
        // at instantiation here.
        defineComputed(vm, key, userDef);
    }
}
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
function initMethods(vm, methods) {
    const props = vm.$options.props;
    for (const key in methods) {
        vm[key] =
            typeof methods[key] !== "function" ? noop : bind(methods[key], vm);
    }
}

function initWatch(vm, watch) {
    for (const key in watch) {
        const handler = watch[key];
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
                createWatcher(vm, key, handler[i]);
            }
        } else {
            createWatcher(vm, key, handler);
        }
    }
}

function createWatcher(
    vm,
    expOrFn,

    handler,
    options
) {
    if (isPlainObject(handler)) {
        options = handler;
        handler = handler.handler;
    }
    if (typeof handler === "string") {
        handler = vm[handler];
    }
    return vm.$watch(expOrFn, handler, options);
}

export function stateMixin(Vue) {
    // flow somehow has problems with directly declared definition object
    // when using Object.defineProperty, so we have to procedurally build up
    // the object here.
    const dataDef = {};
    dataDef.get = function () {
        return this._data;
    };
    Object.defineProperty(Vue.prototype, "$data", dataDef);

    Vue.prototype.$set = set;
    Vue.prototype.$delete = del;

    Vue.prototype.$watch = function (expOrFn, cb, options) {
        const vm = this;
        if (isPlainObject(cb)) {
            return createWatcher(vm, expOrFn, cb, options);
        }
        options = options || {};
        options.user = true;
        const watcher = new Watcher(vm, expOrFn, cb, options);
        if (options.immediate) {
            const info = `callback for immediate watcher "${watcher.expression}"`;
            pushTarget();
            watcher.value
                ? cb.apply(vm, [watcher.value])
                : handler.call(context);
            popTarget();
        }
    };
}
