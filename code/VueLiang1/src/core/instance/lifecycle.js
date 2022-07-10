/* @flow */

import Watcher from "../observer/watcher";

import { noop } from "../util/index";

export function lifecycleMixin(Vue) {
    /**** vue2 源码中 $mount 在另一个位置，这里临时放到这里 */

    /*******************************/
    Vue.prototype._update = function (vnode) {
        const vm = this;
        const prevVnode = vm._vnode;
        vm._vnode = vnode;
        // Vue.prototype.__patch__ is injected in entry points
        // based on the rendering backend used.
        if (!prevVnode) {
            // initial render
            vm.$el = vm.__patch__(vm.$el, vnode);
        } else {
            // updates
            vm.$el = vm.__patch__(prevVnode, vnode);
        }
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
