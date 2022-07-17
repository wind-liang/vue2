/* @flow */

import VNode from "./vnode";
import { extractPropsFromVNodeData } from "./helpers/index";
import { isUndef, isObject } from "../util/index";
import { activeInstance, updateChildComponent } from "../instance/lifecycle";
// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = {
    init(vnode) {
        const child = (vnode.componentInstance =
            createComponentInstanceForVnode(vnode, activeInstance));
        child.$mount();
    },
    prepatch(oldVnode, vnode) {
        const options = vnode.componentOptions;
        const child = (vnode.componentInstance = oldVnode.componentInstance);
        updateChildComponent(
            child,
            options.propsData, // updated props
            options.listeners, // updated listeners
            vnode, // new parent vnode
            options.children // new children
        );
    },
};
const hooksToMerge = Object.keys(componentVNodeHooks);
export function createComponent(Ctor, data, context, children, tag) {
    if (isUndef(Ctor)) {
        return;
    }
    const baseCtor = context.$options._base;

    // plain options object: turn it into a constructor
    if (isObject(Ctor)) {
        Ctor = baseCtor.extend(Ctor);
    }

    data = data || {};

    // extract props
    const propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    const listeners = data.on;

    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;
    // install component management hooks onto the placeholder node
    installComponentHooks(data);
    // return a placeholder vnode
    const name = Ctor.options.name || tag;
    const vnode = new VNode(
        `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
        data,
        undefined,
        undefined,
        undefined,
        context,
        { Ctor, propsData, listeners, tag, children }
    );
    return vnode;
}
function installComponentHooks(data) {
    const hooks = data.hook || (data.hook = {});
    for (let i = 0; i < hooksToMerge.length; i++) {
        const key = hooksToMerge[i];
        const existing = hooks[key];
        const toMerge = componentVNodeHooks[key];
        if (existing !== toMerge && !(existing && existing._merged)) {
            hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
        }
    }
}
export function createComponentInstanceForVnode(
    // we know it's MountedComponentVNode but flow doesn't
    vnode,
    // activeInstance in lifecycle state
    parent
) {
    const options = {
        _isComponent: true,
        _parentVnode: vnode,
        parent,
    };
    return new vnode.componentOptions.Ctor(options);
}
function mergeHook(f1, f2) {
    const merged = (a, b) => {
        // flow complains about extra args which is why we use any
        f1(a, b);
        f2(a, b);
    };
    merged._merged = true;
    return merged;
}
