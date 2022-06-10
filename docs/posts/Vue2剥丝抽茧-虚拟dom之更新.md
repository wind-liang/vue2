---
title: Vue2剥丝抽茧-虚拟 dom 之更新
categories: 前端
tags:
    - vue2
date: 2022-06-08 08:20:33
---

[虚拟 dom 简介](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E7%AE%80%E4%BB%8B.html)、[虚拟 dom 之绑定事件](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6.html) 中我们将虚拟 `dom` 转换为了真实 `dom` 的结构，介绍了 `dom` 中 `class` 、`style` 、绑定事件的过程。

当数据更新的时候，`vue` 会重新触发 `render` ，此时会通过新的 `vdom`来更新视图。

新的 `vdom` 结构可能发生改变，就涉及到 `dom` 的新建、删除和移动，这篇文章先假设更新的 `dom` 结构没有变化，我们来过一下整体更新的过程。

## dom 结构

不管是虚拟 `dom`，还是真实 `dom`，都可以看成一个树结构。

![image-20220609092509798](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220609092509798.png)

对应的 `render` 函数如下：

```js
render(createElement) {
  return createElement(
    "div",
    [
      createElement("div", [
        createElement("div", {}, "left"),
        "hello",
      ]),
      createElement("span", {}, "right"),
    ]
  );
},
```

生成的 `vnode` 如下：

```js
{
    "tag": "div",
    "children": [
        {
            "tag": "div",
            "children": [
                {
                    "tag": "div",
                    "children": [
                        {
                            "text": "left",
                        }
                    ],
                },
                {
                    "text": "hello",
                }
            ],
        },
        {
            "tag": "span",
            "data": {},
            "children": [
                {
                    "text": "right",
                }
            ],
        }
    ],
}
```

渲染的 `dom` 如下：

![image-20220609094006612](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220609094006612.png)

假设新的 `vnode` 结构没有改变，只是 `text` 进行了更新：

```js
{
    "tag": "div",
    "children": [
        {
            "tag": "div",
            "children": [
                {
                    "tag": "div",
                    "children": [
                        {
                            "text": "leftupdate",
                        }
                    ],
                },
                {
                    "text": "hello",
                }
            ],
        },
        {
            "tag": "span",
            "data": {},
            "children": [
                {
                    "text": "rightupdate",
                }
            ],
        }
    ],
}
```

我们只需要同时遍历这两个 `vdom` ，如果有 `tag` 属性就递归它们的 `children` ，如果只有 `text` 属性就更新 `dom` 的 `text` 即可。

```js
function patchVnode (
oldVnode,
 vnode,
) {
  const elm = vnode.elm = oldVnode.elm // 拿到对应的 dom
  const oldCh = oldVnode.children
  const ch = vnode.children
  if (isUndef(vnode.text)) { // 如果没有 text 属性，递归遍历 children
    for(let i = 0; i < oldch.length; i++) {
      patchVnode(oldch[i], ch[i])
    }
    // 如果有 text 属性，说明是 text 节点
  } else if (oldVnode.text !== vnode.text) {
    nodeOps.setTextContent(elm, vnode.text) // 更新 text
  }
}
```

上边就是更新的核心逻辑了，本质上就是对树的一个深度优先遍历，下边我们继续完善一些细节。

## 引入响应式

为了测试数据更新自动更新页面，相比于 [Vue2剥丝抽茧-虚拟dom之绑定事件](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6.html) 的测试程序，我们将上一篇章介绍的 [响应式系统](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F.html) 引入，当点击的时候我们修改 `data` 的数据，然后自动触发页面的 `update` 。

```js
import * as nodeOps from "./node-ops";
import modules from "./modules";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";
import { observe } from "./observer/reactive";
import Watcher from "./observer/watcher";
const options = {
    el: "#root",
    data: {
        selected: 1,
    },
    render(createElement) {
        const vnode = createElement(
            "div",
            {
                on: {
                    click: () => {
                        this.selected = 3;
                    },
                },
            },
            [
                createElement("div", [
                    createElement("div", {}, this.selected + "left"), // 使用 data 数据
                    "hello",
                ]),
                createElement("span", {}, "right"),
            ]
        );
        return vnode;
    },
};

const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};
let $el = document.querySelector(options.el);

const __patch__ = createPatchFunction({ nodeOps, modules });
const _update = (vnode) => {
    $el = __patch__($el, vnode);
};

observe(options.data); // 将数据变为响应式

new Watcher(options.data, () => _update(_render())); // 创建 Watcher
```

这样当我们点击页面的时候，页面就会自动刷新了，`selected` 的值从 `1` 变成了 `3` 。

![Kapture 2022-06-09 at 09.59.26](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comKapture%202022-06-09%20at%2009.59.26.gif)

但因为我们并没有写更新 `dom` 的代码，此时相当于是用新的 `vnode` 生成了新 `dom` 然后直接代替了原 `dom` 。

在创建 `dom` 代码打个断点来看一下：

![Kapture 2022-06-09 at 10.06.03](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comKapture%202022-06-09%20at%2010.06.03.gif)

下边来完善下当 `vnode` 结构不变情况下 `dom` 的更新代码。

## 更新代码

看一下我们原来的 `_update` 方法：

```js
const _update = (vnode) => {
    $el = __patch__($el, vnode);
};
```

因为之前第一次创建 `dom` 的时候还没有旧的 `vdom`，所以我们直接传了 `$el` ，但当第二次更新的时候已经有了 `oldvode` ，我们第一个参数应该把旧的 `vnode` 传入。

```js
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
```

上边模拟一个 `vm` 对象，将 `$el` 挂到 `vm` 对象中，同时用 `vm._vnode` 存储 `vnode` ，这样下一次更新的时候 `vm._vnode` 就代表的是旧的 `vnode` 了。

接下来完善 `createPatchFunction` 返回的 `__patch__` 方法：

```js
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
```

上边的 `else` 分支中的代码是 [虚拟 dom 之绑定事件](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6.html) 中我们介绍的逻辑。

`if` 中判断它不是真实 `dom` 并且当前的 `vnode` 没有改变，然后就调用 `pathVnode` 方法来更新 `dom` 。

其中的 `sameVnode` 我们仅简单判断：

```js
// vue 源码中的 sameVnode 判断的比较多，这里我们仅简单理解为 key、tag 一致，并且 data 属性还存在即可
function sameVnode(a, b) {
    return (
        a.key === b.key && a.tag === b.tag && isDef(a.data) === isDef(b.data)
    );
}
```

接着看一下 `patchVnode` 的实现：

```js
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
  if (isUndef(vnode.text)) { // 不是 text 节点 更新children
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch);
    } else if (isDef(oldVnode.text)) {
      // 更新成了空字符
      nodeOps.setTextContent(elm, "");
    }
  } else if (oldVnode.text !== vnode.text) {
    // text 节点
    nodeOps.setTextContent(elm, vnode.text);
  }
}
```

这就是文章最开始讲的那段逻辑了，不是 `text` 节点就更新 `children`，如果是 `text` 节点就直接更新 `dom` 的文本内容。

除此之外，创建 `dom` 的时候在  [虚拟 dom 之绑定事件](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%BB%91%E5%AE%9A%E4%BA%8B%E4%BB%B6.html)  我们调用了 `cbs.create` ，这里我们调用 `cbs.update` 来更新 `dom` 的属性。

因为这篇文章我们只考虑 `dom` 整个结构没有发生变化的情况，所以我们 `updateChilden` 简单的实现为一个循环即可。

```js
function updateChildren(elm, oldCh, ch) {
  for (let i = 0; i < oldCh.length; i++) {
    patchVnode(oldCh[i], ch[i]);
  }
}
```

以上就是 `dom` 更新的整个过程了。

## 测试

```js
import * as nodeOps from "./node-ops";
import modules from "./modules";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";
import { observe } from "./observer/reactive";
import Watcher from "./observer/watcher";
const options = {
    el: "#root",
    data: {
        selected: 1,
    },
    render(createElement) {
        const vnode = createElement(
            "div",
            {
                on: {
                    click: () => {
                        this.selected = 3;
                    },
                },
            },
            [
                createElement("div", [
                    createElement("div", {}, this.selected + "left"),
                    "hello",
                ]),
                createElement("span", {}, "right"),
            ]
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
```

视图肯定会更新，我们来看一下是删除原有 `dom` 插入新 `dom` ，还是直接在原有 `dom` 上进行的更新：

![Kapture 2022-06-10 at 08.13.03](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comKapture%202022-06-10%20at%2008.13.03.gif)

可以看到代码走到了我们的 `patchVnode`  中，复用了原有 `dom` 进行更新。

# 总

这篇文章主要是加深对虚拟 `dom` 结构的了解，然后通过深度优先遍历对虚拟 `dom` 树进行遍历，因为我们假设了 `dom` 树的结构没有发生变化，所以遍历过程中直接进行节点的更新即可。

如果 `dom` 树发生了变化，为了尽可能的复用原有 `dom` ，就会涉及到 `diff` 算法了，接下来几篇文章会讲到。
