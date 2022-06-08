import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./normalize-children";
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
    children = normalizeChildren(children);
    let vnode = new VNode(tag, data, children);
    return vnode;
}
