import * as nodeOps from "./node-ops";
import modules from "./modules";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";
import { observe } from "./observer/reactive";
import Watcher from "./observer/watcher";
const options = {
    el: "#root",
    data: {
        list: ["a", "b", "c"],
    },
    render(createElement) {
        const children = [];
        for (const item of this.list) {
            children.push(createElement("div", { key: item }, item));
        }
        const vnode = createElement(
            "div",
            {
                on: {
                    click: () => {
                        console.log(1);
                        this.list = ["c", "b", "a"];
                    },
                },
            },
            children
        );
        return vnode;
    },
};

const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};

const __patch__ = createPatchFunction({ nodeOps, modules });

const vm = {};
vm.$el = document.querySelector(options.el);
const _update = (vnode) => {
    const prevVnode = vm._vnode;
    vm._vnode = vnode;
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
        // initial render
        vm.$el = __patch__(vm.$el, vnode);
    } else {
        // updates
        vm.$el = __patch__(prevVnode, vnode);
    }
};

observe(options.data);

new Watcher(options.data, () => _update(_render()));
