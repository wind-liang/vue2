import * as nodeOps from "./node-ops";
import modules from "./modules";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";

const options = {
    el: "#root",
    data: {
        text: "hello,liang",
        text2: "2",
    },
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    click: () => console.log(1),
                    dblclick: () => console.log(2),
                },
            },
            [this.text, createElement("div", this.text2)]
        );
        return test;
    },
};

const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};

const $el = document.querySelector(options.el);

const __patch__ = createPatchFunction({ nodeOps, modules });

function _update(vnode) {
    __patch__($el, vnode);
}

_update(_render());
