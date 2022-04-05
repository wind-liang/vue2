/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from "./util";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        /*****************这里相当于调用了对象 set 需要通知 watcher ************************/
        const ob = this.__ob__;
        // notify change
        ob.dep.notify();
        /**************************************************************************** */
        return result;
    });
});
