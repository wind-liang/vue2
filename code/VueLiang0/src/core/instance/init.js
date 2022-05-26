/* @flow */

import { initState } from "./state";
import { mountComponent } from "./lifecycle";

export function initMixin(Vue) {
    Vue.prototype._init = function (options) {
        const vm = this;
        vm.$options = options;

        initState(vm);

        vm.render = options.render;

        mountComponent(vm);
    };
}
