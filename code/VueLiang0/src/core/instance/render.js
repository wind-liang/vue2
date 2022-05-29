/* @flow */

import { nextTick } from "../util/index";

export function renderMixin(Vue) {
    Vue.prototype.$nextTick = function (fn) {
        return nextTick(fn, this);
    };

    Vue.prototype._render = function () {
        const vm = this;
        const { render } = vm.$options;

        return render.call(vm._renderProxy);
    };
}
