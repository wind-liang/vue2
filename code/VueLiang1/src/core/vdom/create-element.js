import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./helpers/index";
import { isPrimitive } from "../util/index";
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
    let vnode = new VNode(tag, data, children, undefined, undefined, context);
    return vnode;
}
