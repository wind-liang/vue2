/* @flow */

import Watcher from "../observer/watcher";

import { noop } from "../util/index";

export function lifecycleMixin(Vue) {
    /**** vue2 源码中 $mount 在另一个位置，这里临时放到这里 */
    Vue.prototype.$mount = function (el) {
        el = el && document.querySelector(el);
        return mountComponent(this, el);
    };
    /*******************************/
    Vue.prototype._update = function (dom) {
        const vm = this;
        /*****这里仅仅是把 dom 更新，vue2 源码中这里会进行虚拟 dom 的处理 */
        if (vm.$el.children[0]) {
            vm.$el.removeChild(vm.$el.children[0]);
        }
        vm.$el.appendChild(dom);
        /*******************************/
    };
}

export function mountComponent(vm, el) {
    vm.$el = el;
    let updateComponent;
    updateComponent = () => {
        vm._update(vm._render());
    };
    // we set this to vm._watcher inside the watcher's constructor
    // since the watcher's initial patch may call $forceUpdate (e.g. inside child
    // component's mounted hook), which relies on vm._watcher being already defined
    new Watcher(vm, updateComponent, noop /* isRenderWatcher */);
    return vm;
}
