/* @flow */

import { initState } from "./state";
import { initRender } from "./render";

export function initMixin(Vue) {
    Vue.prototype._init = function (options) {
        const vm = this;
        vm.$options = options;
        vm._renderProxy = vm;
        initRender(vm);
        initState(vm);
        if (vm.$options.el) {
            vm.$mount(vm.$options.el);
        }
    };
}
