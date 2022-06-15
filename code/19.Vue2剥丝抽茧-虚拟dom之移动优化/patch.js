import VNode from "./vnode";
import { isDef, isUndef } from "./util";

export const emptyNode = new VNode("", {}, []);
const hooks = ["create", "activate", "update", "remove", "destroy"];
// vue 源码中的 sameVnode 判断的比较多，这里我们仅简单理解为 key、tag 一致，并且 data 属性还存在即可
function sameVnode(a, b) {
    return (
        a.key === b.key && a.tag === b.tag && isDef(a.data) === isDef(b.data)
    );
}
export function createPatchFunction(backend) {
    let i, j;
    const cbs = {};

    const { modules, nodeOps } = backend;

    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            if (isDef(modules[j][hooks[i]])) {
                cbs[hooks[i]].push(modules[j][hooks[i]]);
            }
        }
    }

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
        const data = vnode.data; // dom 相关的属性都放到 data 中
        const children = vnode.children;
        const tag = vnode.tag;
        if (isDef(tag)) {
            vnode.elm = nodeOps.createElement(tag);
            createChildren(vnode, children);
            if (isDef(data)) {
                invokeCreateHooks(vnode);
            }
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

    function invokeCreateHooks(vnode) {
        for (let i = 0; i < cbs.create.length; ++i) {
            cbs.create[i](emptyNode, vnode);
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
    function isPatchable(vnode) {
        return isDef(vnode.tag);
    }
    function patchVnode(oldVnode, vnode) {
        if (oldVnode === vnode) {
            return;
        }

        const elm = (vnode.elm = oldVnode.elm);
        const oldCh = oldVnode.children;
        const ch = vnode.children;
        const data = vnode.data;
        if (isDef(data) && isPatchable(vnode)) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
        }
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch) updateChildren(elm, oldCh, ch);
            } else if (isDef(oldVnode.text)) {
                // 更新成了空字符
                nodeOps.setTextContent(elm, "");
            }
        } else if (oldVnode.text !== vnode.text) {
            nodeOps.setTextContent(elm, vnode.text);
        }
    }
    function createKeyToOldIdx(children, beginIdx, endIdx) {
        let i, key;
        const map = {};
        for (i = beginIdx; i <= endIdx; ++i) {
            key = children[i].key;
            if (isDef(key)) map[key] = i;
        }
        return map;
    }
    function updateChildren(elm, oldCh, ch) {
        let beforeMaxIndex = -1;
        let oldKeyToIdx, idxInOld;
        for (let i = 0; i < ch.length; i++) {
            const newVnode = ch[i];
            if (isUndef(oldKeyToIdx))
                oldKeyToIdx = createKeyToOldIdx(oldCh, 0, oldCh.length - 1);
            idxInOld = isDef(newVnode.key)
                ? oldKeyToIdx[newVnode.key]
                : findIdxInOld(newVnode, oldCh, 0, oldCh.length);

            if (sameVnode(newVnode, oldCh[idxInOld])) {
                newVnode.elm = oldCh[idxInOld].elm;
                patchVnode(oldCh[idxInOld], ch[i]);
                // 移动位置
                if (i > beforeMaxIndex) {
                    // 无需移动
                    beforeMaxIndex = idxInOld;
                } else {
                    const currentVnode = newVnode;
                    const beforeVnode = ch[i - 1];
                    nodeOps.insertBefore(
                        elm,
                        currentVnode.elm,
                        nodeOps.nextSibling(beforeVnode.elm)
                    );
                }
            }
        }
    }
    function findIdxInOld(node, oldCh, start, end) {
        for (let i = start; i < end; i++) {
            const c = oldCh[i];
            if (isDef(c) && sameVnode(node, c)) return i;
        }
    }

    return function patch(oldVnode, vnode) {
        const isRealElement = isDef(oldVnode.nodeType);
        if (!isRealElement && sameVnode(oldVnode, vnode)) {
            // 通过新旧 vnode 进行更新
            patchVnode(oldVnode, vnode);
        } else {
            // vnode 发生改变或者是第一次渲染
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
        }

        return vnode.elm;
    };
}
