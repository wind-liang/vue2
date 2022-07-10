import VNode from "./vnode";
import { isDef, isUndef } from "./util";
import { registerRef } from "./ref";
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
        if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
            return;
        }
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

    function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
        let i = vnode.data;
        if (isDef(i)) {
            // after calling the init hook, if the vnode is a child component
            // it should've created a child instance and mounted it. the child
            // component also has set the placeholder vnode's elm.
            // in that case we can just return the element and be done.
            if (isDef(vnode.componentInstance)) {
                initComponent(vnode, insertedVnodeQueue);
                insert(parentElm, vnode.elm, refElm);
                return true;
            }
        }
    }
    function initComponent(vnode) {
        vnode.elm = vnode.componentInstance.$el;
        if (isPatchable(vnode)) {
            invokeCreateHooks(vnode);
        } else {
            // empty component root.
            // skip all element-related modules except for ref (#3455)
            registerRef(vnode);
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
            } else if (isDef(ch)) {
                // if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, ""); // 源码中有但没有想到对应的例子
                addVnodes(elm, null, ch, 0, ch.length - 1);
            } else if (isDef(oldCh)) {
                removeVnodes(oldCh, 0, oldCh.length - 1);
            }
            // } else if (isDef(oldVnode.text)) { // 源码中有但没有想到对应的例子
            //     nodeOps.setTextContent(elm, "");
            // }
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
    function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            createElm(vnodes[startIdx], parentElm, refElm);
        }
    }
    function updateChildren(parentElm, oldCh, newCh) {
        let oldStartIdx = 0;
        let newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        let oldKeyToIdx, idxInOld, vnodeToMove, refElm;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (isUndef(oldStartVnode)) {
                oldStartVnode = oldCh[++oldStartIdx]; // 已经被置为 undefined 跳过
            } else if (isUndef(oldEndVnode)) {
                // 已经被置为 undefined 跳过
                oldEndVnode = oldCh[--oldEndIdx];
            } else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            } else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldStartVnode, newEndVnode)) {
                // Vnode moved right
                patchVnode(oldStartVnode, newEndVnode);
                nodeOps.insertBefore(
                    parentElm,
                    oldStartVnode.elm,
                    nodeOps.nextSibling(oldEndVnode.elm)
                );
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (sameVnode(oldEndVnode, newStartVnode)) {
                // Vnode moved left
                patchVnode(oldEndVnode, newStartVnode);
                nodeOps.insertBefore(
                    parentElm,
                    oldEndVnode.elm,
                    oldStartVnode.elm
                );
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            } else {
                if (isUndef(oldKeyToIdx))
                    oldKeyToIdx = createKeyToOldIdx(
                        oldCh,
                        oldStartIdx,
                        oldEndIdx
                    );
                idxInOld = isDef(newStartVnode.key)
                    ? oldKeyToIdx[newStartVnode.key]
                    : findIdxInOld(
                          newStartVnode,
                          oldCh,
                          oldStartIdx,
                          oldEndIdx
                      );
                if (isUndef(idxInOld)) {
                    // New element
                    createElm(newStartVnode, parentElm, oldStartVnode.elm);
                } else {
                    vnodeToMove = oldCh[idxInOld];
                    if (sameVnode(vnodeToMove, newStartVnode)) {
                        patchVnode(vnodeToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        nodeOps.insertBefore(
                            parentElm,
                            vnodeToMove.elm,
                            oldStartVnode.elm
                        );
                    } else {
                        // same key but different element. treat as new element
                        createElm(newStartVnode, parentElm, oldStartVnode.elm);
                    }
                }

                newStartVnode = newCh[++newStartIdx];
            }
        }
        if (oldStartIdx > oldEndIdx) {
            refElm = isUndef(newCh[newEndIdx + 1])
                ? null
                : newCh[newEndIdx + 1].elm;
            addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
        } else if (newStartIdx > newEndIdx) {
            removeVnodes(oldCh, oldStartIdx, oldEndIdx);
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
