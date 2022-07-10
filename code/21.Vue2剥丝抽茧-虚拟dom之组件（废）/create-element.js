import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./normalize-children";
import { isPrimitive, resolveAsset, isDef } from "./util";
import config from "./config";

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement(tag, data, children) {
    return _createElement(tag, data, children);
}

export function _createElement(tag, data, children) {
    if (!tag) {
        // in case of component :is set to falsy value
        return createEmptyVNode();
    }
    if (Array.isArray(data) || isPrimitive(data)) {
        children = data;
        data = undefined;
    }
    children = normalizeChildren(children);
    if (typeof tag === "string") {
        let Ctor;
        if (config.isReservedTag(tag)) {
            vnode = new VNode(tag, data, children);
        } else if (
            (!data || !data.pre) &&
            isDef((Ctor = resolveAsset(context.$options, "components", tag)))
        ) {
            // component
            vnode = createComponent(Ctor, data, context, children, tag);
        }
    }
    return vnode;
}
