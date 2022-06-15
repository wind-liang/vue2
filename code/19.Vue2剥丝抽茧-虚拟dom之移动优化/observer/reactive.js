import Dep from "./dep";
import { isObject, hasProto, def, hasOwn } from "./util";
import { arrayMethods } from "./array";

const arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val, shallow) {
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher
    let childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            if (Dep.target) {
                dep.depend();
                if (childOb) {
                    childOb.dep.depend();
                    if (Array.isArray(value)) {
                        dependArray(value);
                    }
                }
            }
            return value;
        },
        set: function reactiveSetter(newVal) {
            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
            childOb = !shallow && observe(newVal);
            dep.notify();
        },
    });
}

export class Observer {
    constructor(value) {
        this.dep = new Dep();
        def(value, "__ob__", this);
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
            this.observeArray(value);
        } else {
            this.walk(value);
        }
    }

    /**
     * 遍历对象所有的属性，调用 defineReactive
     * 拦截对象属性的 get 和 set 方法
     */
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i]);
        }
    }

    /**
     * Observe a list of Array items.
     */
    observeArray(items) {
        for (let i = 0, l = items.length; i < l; i++) {
            observe(items[i]);
        }
    }
}

export function observe(value) {
    if (!isObject(value)) {
        return;
    }
    let ob = new Observer(value);
    return ob;
}

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target, src, keys) {
    for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        def(target, key, src[key]);
    }
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
        e = value[i];
        if (Array.isArray(e)) {
            e && e.__ob__ && e.__ob__.dep.depend();
            dependArray(e);
        }
    }
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target, key, val) {
    if (Array.isArray(target)) {
        target.length = Math.max(target.length, key);
        target.splice(key, 1, val);
        return val;
    }

    // targe 是对象的情况
    // key 在 target 中已经存在
    if (key in target && !(key in Object.prototype)) {
        target[key] = val;
        return val;
    }

    const ob = target.__ob__;
    // target 不是响应式数据
    if (!ob) {
        target[key] = val;
        return val;
    }
    defineReactive(target, key, val);
    ob.dep.notify();
    return val;
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del(target, key) {
    if (Array.isArray(target)) {
        target.splice(key, 1);
        return;
    }
    // targe 是对象的情况
    const ob = target.__ob__;
    if (!hasOwn(target, key)) {
        return;
    }
    delete target[key];
    if (!ob) {
        return;
    }
    ob.dep.notify();
}
