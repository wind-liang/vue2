import config from "../config";
import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./helpers/index";
import { isDef, isPrimitive, resolveAsset } from "../util/index";
import { createComponent } from "./create-component";

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement(context, tag, data, children) {
    return _createElement(context, tag, data, children);
}

export function _createElement(context, tag, data, children) {
    if (!tag) {
        // in case of component :is set to falsy value
        return createEmptyVNode();
    }
    if (Array.isArray(data) || isPrimitive(data)) {
        children = data;
        data = undefined;
    }
    children = normalizeChildren(children);
    let vnode;
    let Ctor;
    if (config.isReservedTag(tag)) {
        vnode = new VNode(tag, data, children, undefined, undefined, context);
    } else if (
        isDef((Ctor = resolveAsset(context.$options, "components", tag)))
    ) {
        // component
        vnode = createComponent(Ctor, data, context, children, tag);
    }
    return vnode;
}
