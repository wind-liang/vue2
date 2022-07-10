/* @flow */

import { nextTick } from "../util/index";
import { createElement } from "../vdom/create-element";

export function initRender(vm) {
    const options = vm.$options;
    vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false);
    // normalization is always applied for the public version, used in
    // user-written render functions.
    vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true);
}

export function renderMixin(Vue) {
    Vue.prototype.$nextTick = function (fn) {
        return nextTick(fn, this);
    };

    Vue.prototype._render = function () {
        const vm = this;
        const { render } = vm.$options;

        return render.call(vm._renderProxy, vm.$createElement);
    };
}
