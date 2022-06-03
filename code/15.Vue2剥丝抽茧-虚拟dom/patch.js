import VNode from "./vnode";
import { isDef } from "./util";

export const emptyNode = new VNode("", {}, []);

export function createPatchFunction(backend) {
    const { nodeOps } = backend;

    function emptyNodeAt(elm) {
        return new VNode(
            nodeOps.tagName(elm).toLowerCase(),
            {},
            [],
            undefined,
            elm
        );
    }

    function removeNode(el) {
        const parent = nodeOps.parentNode(el);
        // element may have already been removed due to v-html / v-text
        if (isDef(parent)) {
            nodeOps.removeChild(parent, el);
        }
    }
    function createElm(vnode, parentElm, refElm) {
        const children = vnode.children;
        const tag = vnode.tag;
        if (isDef(tag)) {
            vnode.elm = nodeOps.createElement(tag);
            createChildren(vnode, children);
            insert(parentElm, vnode.elm, refElm);
        } else {
            vnode.elm = nodeOps.createTextNode(vnode.text);
            insert(parentElm, vnode.elm, refElm);
        }
    }
    function insert(parent, elm, ref) {
        if (isDef(parent)) {
            if (isDef(ref)) {
                if (nodeOps.parentNode(ref) === parent) {
                    nodeOps.insertBefore(parent, elm, ref);
                }
            } else {
                nodeOps.appendChild(parent, elm);
            }
        }
    }

    function createChildren(vnode, children) {
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length; ++i) {
                createElm(children[i], vnode.elm);
            }
        }
    }

    function removeVnodes(vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            const ch = vnodes[startIdx];
            if (isDef(ch)) {
                if (isDef(ch.tag)) {
                    removeAndInvokeRemoveHook(ch);
                } else {
                    // Text node
                    removeNode(ch.elm);
                }
            }
        }
    }
    function removeAndInvokeRemoveHook(vnode, rm) {
        removeNode(vnode.elm);
    }

    return function patch(oldVnode, vnode) {
        const isRealElement = isDef(oldVnode.nodeType);
        if (isRealElement) {
            // either not server-rendered, or hydration failed.
            // create an empty node and replace it
            oldVnode = emptyNodeAt(oldVnode);
        }

        // replacing existing element
        const oldElm = oldVnode.elm;
        const parentElm = nodeOps.parentNode(oldElm);

        // create new node
        createElm(vnode, parentElm, nodeOps.nextSibling(oldElm));

        removeVnodes([oldVnode], 0, 0);
        return vnode.elm;
    };
}
