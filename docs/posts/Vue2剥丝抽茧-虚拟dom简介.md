---
title: Vue2剥丝抽茧-虚拟 dom 简介
categories: 前端
tags:
    - vue2
date: 2022-05-31 08:16:33
---

[从零手写 Vue之响应式系统](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-VueLiang0.html) 中我们通过响应式系统实现了视图的自动更新，但遗留了一个问题是当数据变化的时候我们是将原来的 `dom` 全部删除，然后重新生成所有新 `dom` ，而 `dom` 的生成和渲染是一个相对比较耗时的工作，如果当前组件很复杂的话页面的性能会受到很大的影响。

虚拟 `dom` 就是为了解决这个问题，映射为真实 `dom` 前，我们会先生成虚拟 `dom` ，当数据变化的时候生成新的虚拟 `dom` ，然后将新旧虚拟 `dom` 进行对比，尽可能的复用原有的 `dom`，从而提高页面的性能。

这边文章主要介绍虚拟 `dom` 的定义和将虚拟 `dom` 渲染为真实 `dom` 的过程。

# 虚拟 dom 定义

虚拟 `dom` 用途就是生成真实 `dom` ，我们只需要定义一个对象结构，能通过这个对象来生成真实 `dom` 就够了。

最简单的 `dom` 节点比如一个 `div` 标签。

```html
<div>windliang</div>
```

我们只需要描述 `dom` 的名字和 `dom` 中的元素，`children` 数组中的每一个元素也都是一个 `vnode` 。

```js
const vnode = {
  tag: 'div',
  children: [
    {
      text: 'windliang'
    }
  ]
}
```

然后我们可以通过 `dom API` 去生成真正的 `dom` 。

```js
const children = vnode.children;
const tag = vnode.tag;
vnode.elm = document.createElement(tag);

childVNode = children[0];
const childEle = document.createTextNode(childVNode.text);

vnode.elm.appendChild(childEle);
```

如上所示，把生成的 `dom` 保存到了 `vnode` 的 `elm` 属性中，接下来只需要将生成的 `dom` 插入到相应的节点中即可。

`VNode` 除了 `tag` 、`children` 属性外，还有很多其他属性，如下所示：

```js
//vnode.js
export default class VNode {
    tag;
    data;
    children;
    text;
    elm;
    ns;
    context; // rendered in this component's scope
    key;
    componentOptions;
    componentInstance; // component instance
    parent; // component placeholder node

    // strictly internal
    raw; // contains raw HTML? (server only)
    isStatic; // hoisted static node
    isRootInsert; // necessary for enter transition check
    isComment; // empty comment placeholder?
    isCloned; // is a cloned node?
    isOnce; // is a v-once node?
    asyncFactory; // async component factory function
    asyncMeta;
    isAsyncPlaceholder;
    ssrContext;
    fnContext; // real context vm for functional nodes
    fnOptions; // for SSR caching
    devtoolsMeta; // used to store functional render context for devtools
    fnScopeId; // functional scope id support

    constructor(
        tag,
        data,
        children,
        text,
        elm,
        context,
        componentOptions,
        asyncFactory
    ) {
        this.tag = tag;
        this.data = data;
        this.children = children;
        this.text = text;
        this.elm = elm;
        this.ns = undefined;
        this.context = context;
        this.fnContext = undefined;
        this.fnOptions = undefined;
        this.fnScopeId = undefined;
        this.key = data && data.key;
        this.componentOptions = componentOptions;
        this.componentInstance = undefined;
        this.parent = undefined;
        this.raw = false;
        this.isStatic = false;
        this.isRootInsert = true;
        this.isComment = false;
        this.isCloned = false;
        this.isOnce = false;
        this.asyncFactory = asyncFactory;
        this.asyncMeta = undefined;
        this.isAsyncPlaceholder = false;
    }

    // DEPRECATED: alias for componentInstance for backwards compat.
    /* istanbul ignore next */
    get child() {
        return this.componentInstance;
    }
}

export const createEmptyVNode = (text) => {
    const node = new VNode();
    node.text = text;
    node.isComment = true;
    return node;
};

export function createTextVNode(val) {
    return new VNode(undefined, undefined, undefined, String(val));
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode(vnode) {
    const cloned = new VNode(
        vnode.tag,
        vnode.data,
        // #7975
        // clone children array to avoid mutating original in case of cloning
        // a child.
        vnode.children && vnode.children.slice(),
        vnode.text,
        vnode.elm,
        vnode.context,
        vnode.componentOptions,
        vnode.asyncFactory
    );
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned;
}
```

未来的示例中可能会用到上边的一些其他属性，这里就不细说了。

# 跨平台

上边代码我们假设了创建元素是在浏览器中，直接使用了 `document.xxx` 方法。但如果我们想支持更多的平台，比如 [weex](https://doc.weex.io/zh/) （支持 `iOS`、`Android` 开发)，我们就不能直接使用 `document.xxx` 的形式了，需要使用 `weex` 自己所提供的语法来创建节点。

因此，我们可以提供每个平台各自的创建节点、更新节点、删除节点的一套方法，实现框架的跨平台。

对于浏览器的话，就是下边的方法：

```js
// node-ops
export function createElement(tagName) {
    const elm = document.createElement(tagName);
    return elm;
}

export function createTextNode(text) {
    return document.createTextNode(text);
}

export function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}

export function removeChild(node, child) {
    node.removeChild(child);
}

export function appendChild(node, child) {
    node.appendChild(child);
}

export function parentNode(node) {
    return node.parentNode;
}

export function nextSibling(node) {
    return node.nextSibling;
}

export function tagName(node) {
    return node.tagName;
}

export function setTextContent(node, text) {
    node.textContent = text;
}
```

这样创建节点的时候，我们根据不同平台去引不同的方法簇即可。

```js
import * as nodeOps from "./node-ops"; // 引入操作节点的方法簇
const vnode = { tag: "div", children: [{ text: "windliang" }] };
const children = vnode.children;
const tag = vnode.tag;
vnode.elm = nodeOps.createElement(tag);

const childVNode = children[0];
const childEle = nodeOps.createTextNode(childVNode.text);

nodeOps.appendChild(vnode.elm, childEle);
```

节点的操作我们都调用 `nodeOps` 提供的方法。

这样如果想跨平台的话，我们只需要更改 `import * as nodeOps from "./node-ops";` 这里的引入路径即可，其他代码就无需改动了。

# 整体流程

我们提供一个 `options` 对象，里边包含一个 `render` 方法返回 `vnode` 对象。

```js
const options = {
    el: "#root",
    data: {
        text: "hello,liang",
        text2: "2",
    },
    render() {
        return {
            tag: "div",
            children: [
                {
                    text: this.text,
                },
                {
                    tag: "div",
                    children: [
                        {
                            text: this.text2,
                        },
                    ],
                },
            ],
        };
    },
};
```

`render` 函数中为了使用 `data` 属性，我们可以通过 `call` 函数改变一下 `this` 指向。

```js
const _render = function () {
    const vnode = options.render.call(options.data);
    return vnode;
};
```

然后我们需要获取 `options` 中 `el` 占位 `dom` ，未来将该 `dom` **替换**为由虚拟 `dom` 生成的 `dom`。

```js
const $el = document.querySelector(options.el);
```

最后我们提供一个 `_update` 方法，传入 `_render` 方法返回的虚拟 `dom`，完成虚拟 `dom` 的渲染。

```js
function _update(vnode) {
    __patch__($el, vnode);
}
```

`patch` 方法其实相当于一个渲染器，将虚拟 `dom` 变为真正的 `dom`。

我们可以提供 `createPatchFunction` 函数返回 `patch` 方法。

 `createPatchFunction` 函数内部我们可以通过闭包，将之前写的 `nodeOps` 引入，再封装一些 `patch` 所需要的方法。

```js
// patch.js
import VNode from "./vnode";
import { isDef } from "./util";
/***
// isDef 就是判断当前变量是不是有值
export function isDef(v) {
    return v !== undefined && v !== null;
}
***/
export const emptyNode = new VNode("", {}, []);

export function createPatchFunction(backend) {
    const { nodeOps } = backend;
    ...
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
```

`patch` 函数接受两个 `vnode` 对象，但第一次渲染的时候我们只有占位 `dom` 元素 `$el` ，还没有 `oldVnode` 。

因此先通过是否有 `nodeType` 属性来判断当前是 `dom` 还是虚拟 `dom`，如果是 `dom` 就通过 `emptyNodeAt` 方法创建一个虚拟 `node`，并且将该 `dom` 挂到虚拟 `dom` 的 `el` 属性中。

```js
const isRealElement = isDef(oldVnode.nodeType);
if (isRealElement) {
  // either not server-rendered, or hydration failed.
  // create an empty node and replace it
  oldVnode = emptyNodeAt(oldVnode);
}
```

看一下 `emptyNodeAt` 方法，就是创建一个 `Vnode` 对象返回即可。

```js
function emptyNodeAt(elm) {
  return new VNode(
    nodeOps.tagName(elm).toLowerCase(),
    {},
    [],
    undefined,
    elm
  );
}
```

接下来我们拿到旧的 `dom`  和旧 `dom` 的父 `dom` ，调用 `createElm` 方法。

```js
// replacing existing element
const oldElm = oldVnode.elm;
const parentElm = nodeOps.parentNode(oldElm);

// create new node
createElm(vnode, parentElm, nodeOps.nextSibling(oldElm));
```

`createElm` 接受三个参数，第一个参数是要渲染的 `vnode` ，第二个参数是要加入位置的父节点，第三个参数是定位节点，未来插入 `dom` 会在该节点的前边插入。

可以理解成下边的过程：

```js
<parentElm>
  <oldElm />
  <nodeOps.nextSibling(oldElm) />
<parentElm />
```

调用 `createElm` 方法后就变成了下边的样子：

```js
<parentElm>
  <oldElm />
  <newElm /> // 虚拟 dom 生成的 dom
  <nodeOps.nextSibling(oldElm) />
<parentElm />
```

如果第三个参数不传的话， `createElm` 函数会直接将生成的节点加到 `parent` 节点的最后。

```js
<parentElm>
  <oldElm />
  <nodeOps.nextSibling(oldElm) />
  <newElm /> // 虚拟 dom 生成的 dom
<parentElm />
```

让我们详细看一下 `createElm` 函数：

```js
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
```

拿到 `children` 和 `tag` ，然后通过平台无关的 `nodeOps` 去创建当前 `dom` ，并保存到 `elm` 属性中。

接下来调用 `createChildren` 方法，来创建子节点。

```js
function createChildren(vnode, children) {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; ++i) {
      createElm(children[i], vnode.elm);
    }
  }
}
```

我们只需要遍历当前数组，然后同样调用 `createElm` 函数。

再看一眼上边的 `createElm` 函数，当节点创建好以后，会调用 `insert` 方法，把生成的节点加入到 `parentElm` 中。

```js
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
```

`insert` 方法就会用到前边介绍的第三个参数，如果有第三个参数会调用 `insertBefore` 方法，不然的话就是直接调用 `appendChild` 方法插入。

这样 `createElm` 就介绍完了：

```js
function patch(oldVnode, vnode) {
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
```

当前在 `parentElm` 中通过 `vnode` 插入了一个新节点：

```js
<parentElm>
  <oldElm />
  <newElm />
  <nodeOps.nextSibling(oldElm) />
<parentElm />
```

因此我们最后还需要调用 `removeVnodes` 函数把旧的 `dom` 元素删除。

```js
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
function removeNode(el) {
  const parent = nodeOps.parentNode(el);
  // element may have already been removed due to v-html / v-text
  if (isDef(parent)) {
    nodeOps.removeChild(parent, el);
  }
}
```

最终通过 `nodeOps.removeChild` 删除旧节点即可。

```js
<parentElm>
  <newElm /> // 虚拟 dom 生成的节点
  <nodeOps.nextSibling(oldElm) />
<parentElm />
```

全部完成后的 `dom` 如上所示，我们把占位节点变为了 `vnode` 生成的 `dom` 节点。

看一下 `patch` 完整代码：

```js
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
```

# 测试

首先页面提供一个 `dom` 节点用来占位：

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
    </head>
    <body>
        <div id="root"></div>
        <script src="bundle.js"></script>
    </body>
</html>

```

然后 `el` 设置 `#root`， `render` 方法返回虚拟 `dom` ：

```js
import * as nodeOps from "./node-ops";
import { createPatchFunction } from "./patch";
const options = {
    el: "#root",
    data: {
        text: "hello,liang",
        text2: "2",
    },
    render() {
        return {
            tag: "div",
            children: [
                {
                    text: this.text,
                },
                {
                    tag: "div",
                    children: [
                        {
                            text: this.text2,
                        },
                    ],
                },
            ],
        };
    },
};

const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};

const $el = document.querySelector(options.el); // 占位节点

const __patch__ = createPatchFunction({ nodeOps }); // 返回 patch 方法

function _update(vnode) {
    __patch__($el, vnode);
}

_update(_render());
```

最终页面就正常渲染了两个 `dom` 元素：

![image-20220603143433935](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220603143433935.png)

并且原来的 ` <div id="root"></div>` 也进行了删除。

# 完善 render

上边 `render` 函数中我们直接返回了一个对象，

```js
render() {
  return {
    tag: "div",
    children: [
      {
        text: this.text,
      },
      {
        tag: "div",
        children: [
          {
            text: this.text2,
          },
        ],
      },
    ],
  };
},
```

严格来说它只是一个像 `vnode` 的对象，但并不是真正的 `vode` 对象，文章最开头我们也看到了 `Vnode` 对象有好多好多参数，很多参数也有默认值，因此 `render` 函数会提供一个 `createElement` 来帮助我们生成真正的 `Vnode` 。

我们只需要改成下边的样子：

```js
render(createElement) {
  const test = createElement("div", [
    this.text,
    createElement("div", this.text2),
  ]);
  return test;
},
```

下边我们来实现一版简易的 `createElement` 函数。

```js
import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./normalize-children";
export function createElement(tag, children) {
    return _createElement(tag, children);
}

export function _createElement(tag, children) {
    if (!tag) {
        // in case of component :is set to falsy value
        return createEmptyVNode();
    }
    children = normalizeChildren(children);
    let vnode = new VNode(tag, null, children);
    return vnode;
}
```

因为 `children` 传进来的可能不是 `vnode` 对象，比如可能只是一个字符传，我们需要调用 `normalizeChildren` 把它标准化。

下边看一下 `normalizeChildren` 函数：

```js
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

```

上边我们只处理当前 `child` 是字符串的时候，我们就创建一个 `createTextVNode` 节点，真正源码中会处理很多很多情况。

然后我们的测试函数，在 `_render` 函数中，将 `createElement` 传入即可：

```js
const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};
```

整个的测试代码就变成了下边的样子：

```js
import * as nodeOps from "./node-ops";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";

const options = {
    el: "#root",
    data: {
        text: "hello,liang",
        text2: "2",
    },
    render(createElement) {
        const test = createElement("div", [
            this.text,
            createElement("div", this.text2),
        ]);
        return test;
    },
};

const _render = options.render.bind(options.data, createElement);

const $el = document.querySelector(options.el);

const __patch__ = createPatchFunction({ nodeOps });

function _update(vnode) {
    __patch__($el, vnode);
}

_update(_render());
```

最终生成的页面和之前是完全一致的。

# 总

这边文章了解了什么是虚拟 `dom` 和如何将虚拟 `dom` 渲染为真实 `dom` ，了解了 `Vue` 中生成 `dom` 的全过程。

通过抽象出虚拟 `dom` ，除了提高性能，还有一个好处就是可以更好的支持扩平台。
