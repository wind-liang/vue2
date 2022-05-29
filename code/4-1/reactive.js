import Dep from "./dep";
/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val) {
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }

    /*********************************************/
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher
    /*********************************************/

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
        this.walk(value);
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
