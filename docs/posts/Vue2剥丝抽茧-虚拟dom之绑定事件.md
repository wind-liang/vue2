---
title: Vue2剥丝抽茧-虚拟 dom 之事件绑定
categories: 前端
tags:
    - vue2
date: 2022-06-05 08:15:33
---

[虚拟dom简介](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E7%AE%80%E4%BB%8B.html) 中我们将虚拟 `dom` 转换为了真实 `dom` 的结构，但 `dom` 还包含很多属性，比如 `class` 、`style` 等，还可以绑定事件函数等都没有实现，这篇文章来详细介绍一下绑定原生事件的过程。

## 绑定整体过程

`vue2` 中将 `style` 、`class` 、原生事件的设置都单独为了一个文件。

![image-20220605100050970](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220605100050970.png)

见名思意，`class.js` 处理 `class` 的添加删除、`style.js` 处理 `style` 的添加删除、`events.js` 就是我们这篇文章的主角，处理 `dom` 事件的添加删除。

每一个文件都会导出同样名字的几个函数，`'create', 'activate', 'update', 'remove', 'destroy'`，代表在不同生命周期去执行当前函数。

比如 `style.js`：

```js
/* @flow */

import { getStyle, normalizeStyleBinding } from 'web/util/style'
import { cached, camelize, extend, isDef, isUndef, hyphenate } from 'shared/util'

const cssVarRE = /^--/
const importantRE = /\s*!important$/
...

function updateStyle (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  ...
}

export default {
  create: updateStyle,
  update: updateStyle
}

```

`class.js` ：

```js
/* @flow */

import {
  isDef,
  isUndef
} from 'shared/util'

import {
  concat,
  stringifyClass,
  genClassForVnode
} from 'web/util/index'

function updateClass (oldVnode: any, vnode: any) {
  ...
}

export default {
  create: updateClass,
  update: updateClass
}

```

`event.js`：

```js
/* @flow */

import { isDef, isUndef } from 'shared/util'
...
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  // vnode is empty when removing all listeners,
  // and use old vnode dom element
  target = vnode.elm || oldVnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)
  target = undefined
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners,
  destroy: (vnode: VNodeWithData) => updateDOMListeners(vnode, emptyNode)
}

```

这些函数会在什么时候调用呢？

当然是在生成 `dom` 的过程中了，也就是在 [虚拟dom简介](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E7%AE%80%E4%BB%8B.html) 中介绍的 `createPatchFunction` 中的 `createElm` 函数。

```js
function createElm(vnode, parentElm, refElm) {
  const children = vnode.children;
  const tag = vnode.tag;
  if (isDef(tag)) {
    vnode.elm = nodeOps.createElement(tag);
    createChildren(vnode, children);
    /****************/
    // 这里去调用钩子函数，来添加 class、style、事件等
    /****************/
    insert(parentElm, vnode.elm, refElm);
  } else {
    vnode.elm = nodeOps.createTextNode(vnode.text);
    insert(parentElm, vnode.elm, refElm);
  }
}
```

同样的，因为涉及到 `dom` 的操作，属于平台无关的，我们把 `style.js` 、`class.js` 这些放到 `modules` 文件夹中保存，然后整体导入。

调用 `createPatchFunction` 的时候，和 `dom` 的增删改一样，作为参数传入：

```js
import modules from "./modules";  // style.js、class.js 的操作，包含 create、update 等方法

const __patch__ = createPatchFunction({ nodeOps, modules });
```

在 `createPatchFunction` 函数中，我们将 `modules` 拿到，然后按照生命周期进行分类，放到 `cbs` 对象中。

```js
const hooks = ["create", "activate", "update", "remove", "destroy"];

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
   ...
}
```

`modules` 原来样子是：

```js
[
  klass: { // class 相关函数
    create: () => {...},
  	update: () => {...}
  },
  events: { // 事件相关函数
    create: () => {...},
    update: () => {...},
    destroy: () => {...}
  },
  style: { // style 相关函数
    create: () => {...},
  	update: () => {...}
  }
]
```

然后通过对 `modules` 的遍历，把相应生命周期的函数都放到 `cbs` 对象中：

```js
{
  create: [
    () => {...}, // class 对应的 create 函数
  	() => {...}, // 事件对应的 create 函数
    () => {...} // style 对应的 create 函数
  ],
  activate: [
    () => {...},
    () => {...},
    () => {...}
  ],
  update: [
    () => {...},
    () => {...},
    () => {...}
  ],
}
```

相当于原来的 `modules` 是按照功能分类，通过转换变为按照生命周期分类，将 `create` 相关的函数都放在了一起。

然后我们在  `createElm` 函数中调用 `invokeCreateHooks` 函数：

```js
function createElm(vnode, parentElm, refElm) {
  const data = vnode.data; // dom 相关的属性都放到 data 中
  const children = vnode.children;
  const tag = vnode.tag;
  if (isDef(tag)) {
    vnode.elm = nodeOps.createElement(tag);
    createChildren(vnode, children);
    if (isDef(data)) { // dom 相关的属性都放到 data 中
      invokeCreateHooks(vnode, insertedVnodeQueue);
    }
    insert(parentElm, vnode.elm, refElm);
  } else {
    vnode.elm = nodeOps.createTextNode(vnode.text);
    insert(parentElm, vnode.elm, refElm);
  }
}
```

 `invokeCreateHooks` 函数去调用 `cbs` 中 `create` 相关的函数即可：

```js
function invokeCreateHooks(vnode) {
  for (let i = 0; i < cbs.create.length; ++i) {
    cbs.create[i](emptyNode, vnode);
  }
}
```

接下来我们来详细看一下 `event.js` 中的 `create` 函数，也就是 `dom` 绑定事件的过程。

## 绑定事件

```js
export default {
  create: updateDOMListeners,
  update: updateDOMListeners,
  destroy: (vnode) => updateDOMListeners(vnode, emptyNode)
}
```

`create` 、`update`、`destroy` 函数都是复用 `updateDOMListeners` 方法，让我们看一下：

```js
/*
export function isUndef(v) { // 判断没有值
    return v === undefined || v === null;
}
*/
function updateDOMListeners (oldVnode, vnode) {
  // 没有 data.on 属性直接结束
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  // vnode is empty when removing all listeners,
  // and use old vnode dom element
  target = vnode.elm || oldVnode.elm // 拿到当前的 dom 元素
  updateListeners(on, oldOn, add, remove, createOnceHandler)
  target = undefined
}
```

首先拿到新旧 `vonde` 的 `on` 事件，`on` 就是一个对象，对象名是事件名，可能是下边的样子：

```js
on: {
  click: () => console.log(1),
  dblclick: () => console.log(2),
},
```

接着就是调用 `updateListeners` 方法，传入的参数中除了 `on` 和 `oldOn`，我们再依次看一下 `add, remove, createOnceHandler` 函数。

`add` 方法就是调用 `dom` 的 `addEventListener` 函数，添加事件监听。

```js
import {  supportsPassive } from "../util";
function add(name, handler, capture, passive) {
    target.addEventListener(
        name,
        handler,
        supportsPassive ? { capture, passive } : capture
    );
}
```

`supportsPassive` 这个值的设置比较有意思，这里讲一下。

首先 `addEventListener` 这个函数的第三个参数在旧版浏览器中应该传一个布尔型变量，代表是否 `capture`，后来第三个参数变成了一个 `options` 对象。

所以我们需要知道浏览器是否支持 `passive` 属性，如果支持的话就传 `{ capture, passive } ` ，否则就传 `capture` 这个布尔值。

那么我们怎么知道浏览器是否支持 `passive` 属性，也就是 `supportsPassive` 这个变量的值我们怎么确认呢？

看下 `Vue` 中的实现：

```js
export const inBrowser = typeof window !== "undefined";

export let supportsPassive = false;
if (inBrowser) {
    try {
        const opts = {};
        Object.defineProperty(opts, "passive", {
            get() {
                /* istanbul ignore next */
                supportsPassive = true;
            },
        }); // https://github.com/facebook/flow/issues/285
        window.addEventListener("test-passive", null, opts);
    } catch (e) {}
}
```

首先我们利用 `esmoule` 导出的特性，先导出 `supportsPassive` 变量赋值为 `false`，详见 [Webpack打包commonjs和esmodule模块的产物对比](https://windliang.wang/2022/05/02/Webpack%E6%89%93%E5%8C%85commonjs%E5%92%8Cesmodule%E6%A8%A1%E5%9D%97%E7%9A%84%E4%BA%A7%E7%89%A9%E5%AF%B9%E6%AF%94/)。

接下来我们定义了 `opts` 的 `passive` 的 `get` 属性，在里边将 `supportsPassive` 值改为 `true` 。

然后调用 `addEventListener` 函数，随意绑定一个事件名，将 `opts` 传入，如果浏览器支持 `passive` 属性，那么一定会去读取 `passive`，此时就会走到 `get` 里将 `supportsPassive` 值改为 `true` 。

只能说秒啊！更详细的说明也可以看一下 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)。

然后是 `remove` 方法：

```js
function remove(name, handler, capture, _target) {
    (_target || target).removeEventListener(
        name,
        handler,
        capture
    );
}
```

调用 `dom` 的 `removeEventListener` 方法即可。

最后是 `createOnceHandler` 方法：

```js
function createOnceHandler(event, handler, capture) {
    const _target = target; // save current target element in closure
    return function onceHandler() {
        const res = handler.apply(null, arguments);
        if (res !== null) {
            remove(event, onceHandler, capture, _target);
        }
    };
}
```

其实就是当 `handler` 执行结束后就调用上边的 `remove` 方法解除监听。

三个方法介绍结束后我们再回到 `updateDOMListeners` 方法

```js
function updateDOMListeners (oldVnode, vnode) {
  // 没有 data.on 属性直接结束
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  // vnode is empty when removing all listeners,
  // and use old vnode dom element
  target = vnode.elm || oldVnode.elm // 拿到当前的 dom 元素
  updateListeners(on, oldOn, add, remove, createOnceHandler)
  target = undefined
}
```

详细看一下 `updateListeners` 方法的实现：

```js
export function updateListeners(on, oldOn, add, remove, createOnceHandler) {
    let name, def, cur, old, event;
    for (name in on) {
        def = cur = on[name];
        old = oldOn[name];
        event = normalizeEvent(name);
        if (isUndef(old)) { // 说明是第一次添加
            ...
            add(event.name, cur, event.capture, event.passive, event.params);
        } else if (cur !== old) {
            old.fns = cur;
            on[name] = old;
        }
    }
    for (name in oldOn) {
        if (isUndef(on[name])) {
            event = normalizeEvent(name);
            remove(event.name, oldOn[name], event.capture);
        }
    }
}
```

`for` 循环遍历 `on` 中的所有事件，`on` 可能是下边的样子：

```js
on: {
  click: () => console.log(1),
  dblclick: () => console.log(2),
},
```

循环中先调用 `normalizeEvent(name)` 将事件名标准化，这里的 `name` 就是 `click` 和 `dblclick` ，看一下 `normalizeEvents` 函数：

```js
const normalizeEvent = cached((name) => {
    const passive = name.charAt(0) === "&";
    name = passive ? name.slice(1) : name;
    const once = name.charAt(0) === "~"; // Prefixed last, checked first
    name = once ? name.slice(1) : name;
    const capture = name.charAt(0) === "!";
    name = capture ? name.slice(1) : name;
    return {
        name,
        once,
        capture,
        passive,
    };
});
```

先不管内容，首先它调用了 `cached` 函数，其实就是将每次调用的结果缓存，当后续调用时候传入的参数 `name` 如果之前调用过就直接返回结果。

```js
/**
 * Create a cached version of a pure function.
 */
export function cached(fn) {
    const cache = Object.create(null);
    return function cachedFn(str) {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
    };
}
```

再回到 `normalizeEvent` 函数：

```js
const normalizeEvent = cached((name) => {
    const passive = name.charAt(0) === "&";
    name = passive ? name.slice(1) : name;
    const once = name.charAt(0) === "~"; // Prefixed last, checked first
    name = once ? name.slice(1) : name;
    const capture = name.charAt(0) === "!";
    name = capture ? name.slice(1) : name;
    return {
        name,
        once,
        capture,
        passive,
    };
});
```

依次判断了 `&`、`~`、`!`，最后返回包含 `name、once、capture、passive` 属性的对象。

其实这里在解析我们平常开发中在模版中经常用的事件修饰符，`once`、`capture` 等。

```html
<div v-on:click.once.capture="doThat">...</div>
```

如果通过 `js` 写事件修饰符，我们可以在事件名前加  `&`、`~`、`!`。

```js
on: {
  '~!click': () => console.log(1),
},
```

详见 [官方](https://cn.vuejs.org/v2/guide/render-function.html#%E4%BA%8B%E4%BB%B6-amp-%E6%8C%89%E9%94%AE%E4%BF%AE%E9%A5%B0%E7%AC%A6) 文档的介绍：

![image-20220605145323214](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220605145323214.png)

`normalizeEvent(name)` 解析结束后，就是一个 `if...else...` ，分为两种情况，如果 `old` 不存在说明是第一次添加，否则就是更新事件：

```js
if (isUndef(old)) { // 说明是第一次添加
  add(event.name, cur, event.capture, event.passive, event.params);
} else if (cur !== old) {
  ...
}
```

当我们需要更新事件时，常规做法可能是把之前添加过事件的移除，然后新增即可，具体操作如下所示：

```js
if (isUndef(old)) { // 说明是第一次添加
  add(event.name, cur, event.capture, event.passive, event.params);
} else if (cur !== old) { // 更新事件
  remove(event.name, oldOn[name], event.capture);
  add(event.name, cur, event.capture, event.passive);
}
```

但 `Vue` 中采取了一种更加优雅的方式，它没有移除原有的监听函数，而是仅仅改变了原有函数**所执行函数**的指向。

本质上就是利用对象的属性如果是一个函数，那么该属性只是一个引用，而不是值本身，举个例子：

```js
const a = {
  func: () => {console.log(1)}
}
const b = () => {
  a.func()
}
setTimeout(b, 1000)

a.func = () => {console.log(2)}
```

问：控制台输出的会是几？

答案是 `2` 了，因为 `b` 中执行的函数被动态更改了。

因为 `js` 中函数也是对象，所以函数也可以挂属性。让我们再改的复杂些：

```js
const a = () => {
  console.log(1)
}

const invoker = () => {
  const fn = invoker.fn;
  fn()
}
invoker.fn = a

setTimeout(invoker, 1000)

invoker.fn = () => {console.log(2)}
```

`invoker` 从自己身上取到了 `fn` 来执行，后来动态改变 `invoker.fn` 的值，最终同样输出了 `2` 。

如果理解了上边的过程，下边对于 `vue` 处理事件的做法就很好理解了。

回到 `updateListeners` 方法中：

```js
export function updateListeners(on, oldOn, add, remove, createOnceHandler) {
    let name, def, cur, old, event;
    for (name in on) {
        def = cur = on[name];
        old = oldOn[name];
        event = normalizeEvent(name);
        if (isUndef(old)) {
            if (isUndef(cur.fns)) {
                cur = on[name] = createFnInvoker(cur);
            }
            ...
            add(event.name, cur, event.capture, event.passive);
        } else if (cur !== old) {
            old.fns = cur;
            on[name] = old;
        }
    }
}
```

我们聚焦到这一行：

```js
if (isUndef(cur.fns)) {
  cur = on[name] = createFnInvoker(cur);
}
```

看一下 `createFnInvoker` 函数，其实就是我们上边介绍的过程了：

```js
export function createFnInvoker(fns) {
    function invoker() {
        const fns = invoker.fns;
        if (Array.isArray(fns)) {
            const cloned = fns.slice();
            for (let i = 0; i < cloned.length; i++) {
                cloned[i].apply(null, arguments);
            }
        } else {
            return fns.apply(null, arguments);
        }
    }
    invoker.fns = fns;
    return invoker;
}
```

我们把当前函数添加到 `invoker` 上，然后将 `invoker` 函数返回。`invoker` 函数执行的时候先取到 `fns` ，再判断是数组还是函数，通过 `apply` 方法去执行。

当更新事件的时候，我们只需要更新 `fns` 的值即可：

```js
if (isUndef(old)) {
  if (isUndef(cur.fns)) {
    cur = on[name] = createFnInvoker(cur);
  }
  add(event.name, cur, event.capture, event.passive);
} else if (cur !== old) {
  old.fns = cur; // 覆盖 fns 的值即可，不需要移除原有的事件
  on[name] = old;
}
```

再看一下整体代码：

```js
export function updateListeners(on, oldOn, add, remove, createOnceHandler) {
    let name, def, cur, old, event;
    for (name in on) {
        def = cur = on[name];
        old = oldOn[name];
        event = normalizeEvent(name);
        if (isUndef(old)) {
            if (isUndef(cur.fns)) {
                cur = on[name] = createFnInvoker(cur);
            }
            if (isTrue(event.once)) { // 判断是否只需要调用一次
                cur = on[name] = createOnceHandler(
                    event.name,
                    cur,
                    event.capture
                );
            }
            add(event.name, cur, event.capture, event.passive);
        } else if (cur !== old) {
            old.fns = cur;
            on[name] = old;
        }
    }
    for (name in oldOn) {
        if (isUndef(on[name])) {
            event = normalizeEvent(name);
            remove(event.name, oldOn[name], event.capture);
        }
    }
}
```

因为新传入的 `vonde` 相比旧的 `vnode` 可能会少了某些事件，因此我们还需要一个 `for` 循环判断：如果新的 `vonde` 已经没有了旧`vnode` 的事件，调用 `remove` 即可。

```js
for (name in oldOn) {
  if (isUndef(on[name])) {
    event = normalizeEvent(name);
    remove(event.name, oldOn[name], event.capture);
  }
}
```

所以如果我们想去除当前 `dom` 的所有事件，只需要传递一个空的 `vnode` 即可，如下所示：

```js
export default {
    create: updateDOMListeners,
    update: updateDOMListeners,
    destroy: (vnode) => updateDOMListeners(vnode, emptyNode),
};
```

以上就是添加 `dom` 事件和更新 `dom` 事件的全过程了，下边让我们测试一下。

## 测试

相比于上一篇文章，`render` 函数中除了传 `tag` 名和 `children` ，我们会多传一个 `data` 参数，包含一个 `on` 属性。

```js
render(createElement) {
  const test = createElement(
    "div",
    {
      on: {
        click: () => console.log(1),
      },
    },
    [this.text, createElement("div", this.text2)]
  );
  return test;
},
```

相应的 `createElement` 也要添加相应的参数用来生成 `vnode` 对象。

```js
import VNode, { createEmptyVNode } from "./vnode";
import { normalizeChildren } from "./normalize-children";
// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement(tag, data, children) {
    return _createElement(tag, data, children);
}

export function _createElement(tag, data, children) {
    if (!tag) {
        // in case of component :is set to falsy value
        return createEmptyVNode();
    }
    children = normalizeChildren(children);
    let vnode = new VNode(tag, data, children); // 将 data 传递给 vnode
    return vnode;
}
```

以下就是全部测试代码：

```js
import * as nodeOps from "./node-ops";
import modules from "./modules"; // 定义了 dom 的更新
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
```

看一下效果：

![Kapture 2022-06-05 at 16.03.40](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comwindliangblog.oss-cn-beijing.aliyuncs.comKapture%202022-06-05%20at%2016.03.40.gif)

控制台成功有了输出，说明我们的 `dom` 点击事件绑定成功了。

## 总

绑定 `dom` 的过程其中两个点还是比较有趣的：一个是 `supportsPassive`  的赋值，还有 `dom` 事件更新时候通过改变指向，避免了 `dom` 事件的频繁移除和添加，只能用优雅二字来形容了。

另外会发现源码中会有很多 `normalizeXXX` 的操作，一方面就是给了用户更多的操作性，扩展性会更高一些。另一方面当标准化后，对于后续代码的逻辑也会更顺畅一些，有效避免错误的发生。

除了事件的绑定，`style`、`class` 等的设置，也都在 `modules` 文件夹中，调用的位置和上边的 `dom` 绑定是一致的，都是在拿到 `cbs` 对象后遍历调用，对应源码的位置在 `src/platforms/web/runtime/modules` ，细节的话大家感兴趣也可以看一看。

