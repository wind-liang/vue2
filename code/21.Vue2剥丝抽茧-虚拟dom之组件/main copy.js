import * as nodeOps from "./node-ops";
const vnode = { tag: "div", children: [{ text: "windliang" }] };
const children = vnode.children;
const tag = vnode.tag;
vnode.elm = nodeOps.createElement(tag);

const childVNode = children[0];
const childEle = nodeOps.createTextNode(childVNode.text);

nodeOps.appendChild(vnode.elm, childEle);
nodeOps.appendChild(document.body, vnode.elm);
