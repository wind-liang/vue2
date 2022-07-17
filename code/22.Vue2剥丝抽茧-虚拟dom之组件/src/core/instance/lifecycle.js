/* @flow */

import Watcher from "../observer/watcher";

import { noop, emptyObject } from "../util/index";
export let activeInstance = null;
export function setActiveInstance(vm) {
    const prevActiveInstance = activeInstance;
    activeInstance = vm;
    return () => {
        activeInstance = prevActiveInstance;
    };
}
export function lifecycleMixin(Vue) {
    Vue.prototype._update = function (vnode) {
        const vm = this;
        const prevVnode = vm._vnode;
        const restoreActiveInstance = setActiveInstance(vm);
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
        restoreActiveInstance();
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

export function updateChildComponent(
    vm,
    propsData,
    listeners,
    parentVnode,
    renderChildren
) {
    vm.$options._parentVnode = parentVnode;
    vm.$vnode = parentVnode; // update vm's placeholder node without re-render

    if (vm._vnode) {
        // update child tree's parent
        vm._vnode.parent = parentVnode;
    }
    vm.$options._renderChildren = renderChildren;

    // update $attrs and $listeners hash
    // these are also reactive so they may trigger child update if the child
    // used them during render
    vm.$attrs = parentVnode.data.attrs || emptyObject;
    vm.$listeners = listeners || emptyObject;

    // update props
    if (propsData && vm.$options.props) {
        const props = vm._props;
        const propKeys = vm.$options._propKeys || [];
        for (let i = 0; i < propKeys.length; i++) {
            const key = propKeys[i];
            props[key] = propsData[key];
        }
        // keep a copy of raw propsData
        vm.$options.propsData = propsData;
    }

    // update listeners
    // listeners = listeners || emptyObject;
    // const oldListeners = vm.$options._parentListeners;
    // vm.$options._parentListeners = listeners;
    // updateComponentListeners(vm, listeners, oldListeners);

    // resolve slots + force update if has children
    // if (needsForceUpdate) {
    //     vm.$slots = resolveSlots(renderChildren, parentVnode.context);
    //     vm.$forceUpdate();
    // }
}
