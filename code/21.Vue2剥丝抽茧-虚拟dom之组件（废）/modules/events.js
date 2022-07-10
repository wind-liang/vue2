/* @flow */

import { isUndef, supportsPassive } from "../util";
import { updateListeners } from "../update-listeners";
import { emptyNode } from "../patch";

let target;

function createOnceHandler(event, handler, capture) {
    const _target = target; // save current target element in closure
    return function onceHandler() {
        const res = handler.apply(null, arguments);
        if (res !== null) {
            remove(event, onceHandler, capture, _target);
        }
    };
}

function add(name, handler, capture, passive) {
    target.addEventListener(
        name,
        handler,
        supportsPassive ? { capture, passive } : capture
    );
}

function remove(name, handler, capture, _target) {
    (_target || target).removeEventListener(
        name,
        handler._wrapper || handler,
        capture
    );
}

function updateDOMListeners(oldVnode, vnode) {
    if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
        return;
    }
    const on = vnode.data.on || {};
    const oldOn = oldVnode.data.on || {};
    // vnode is empty when removing all listeners,
    // and use old vnode dom element
    target = vnode.elm || oldVnode.elm;
    updateListeners(on, oldOn, add, remove, createOnceHandler);
    target = undefined;
}

export default {
    create: updateDOMListeners,
    update: updateDOMListeners,
    destroy: (vnode) => updateDOMListeners(vnode, emptyNode),
};
