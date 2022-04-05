import Dep from "./dep";
import { hasProto, def } from "./util";
import { arrayMethods } from "./array";

/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val, shallow) {
    /*********************************************/
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher
    /*********************************************/

    const property = Object.getOwnPropertyDescriptor(obj, key);
    if (property && property.configurable === false) {
        return;
    }
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }

    let childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            /*********************************************/
            // 1.这里需要去保存当前在执行的函数
            if (Dep.target) {
                dep.depend();
            }
            /*********************************************/
            return value;
        },
        set: function reactiveSetter(newVal) {
            const value = getter ? getter.call(obj) : val;

            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
            /*********************************************/
            // 2.将依赖当前数据依赖的函数执行
            dep.notify();
            /*********************************************/
        },
    });
}

export class Observer {
    constructor(value) {
        def(value, "__ob__", this);
        this.walk(value);
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
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
}

export function observe(value) {
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
