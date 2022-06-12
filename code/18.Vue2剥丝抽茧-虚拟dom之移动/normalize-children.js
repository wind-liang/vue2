/* @flow */

import { createTextVNode } from "./vnode";
import { isUndef, isPrimitive } from "./util";

export function normalizeChildren(children) {
    return isPrimitive(children)
        ? [createTextVNode(children)]
        : Array.isArray(children)
        ? normalizeArrayChildren(children)
        : undefined;
}

function normalizeArrayChildren(children) {
    const res = [];
    let i, c;
    for (i = 0; i < children.length; i++) {
        c = children[i];
        if (isUndef(c) || typeof c === "boolean") continue;
        if (isPrimitive(c)) {
            if (c !== "")
                // convert primitive to vnode
                res.push(createTextVNode(c));
            // 省略了很多 if else
        } else {
            // 走到这里说明当前 c 已经是一个 vnode 节点了
            res.push(c);
        }
    }
    return res;
}
