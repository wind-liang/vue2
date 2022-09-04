---
title: Vue2剥丝抽茧-模版编译之静态render
categories: 前端
tags:
    - vue2
date: 2022-09-04 07:31:33
---

上篇文章 [模版编译之生成AST](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E7%94%9F%E6%88%90AST.html) 中将模版转为了 `AST` ，这篇文章会将  `AST` 转为最终的 `render` 函数。

## 静态节点

[模版编译之生成AST](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E7%94%9F%E6%88%90AST.html)  中我们转换的例子是 `"<div><span>3<5吗</span><span>?</span></div>"` ，可以看到所有的节点不涉及变量和任何 `vue` 的指令，因此当 [虚拟 dom 重新 patch](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E6%9B%B4%E6%96%B0.html#dom-%E7%BB%93%E6%9E%84) 的时候是不需要进行 `diff` 的，所以我们可以在生成 `render` 函数的时候将这些静态节点单独标记出来。

生成 `render` 函数前，我们对所有的 `AST` 进行遍历标记，`options` 提供一些平台相关的变量，`isReservedTag` 函数来判断是否是合法的标签，比如 `div`、`span` 等，[虚拟dom之组件](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%BB%84%E4%BB%B6.html#%E7%94%9F%E6%88%90%E8%99%9A%E6%8B%9F-dom) 有写过。

```js
const options = {
    isReservedTag,
};
optimize(ast, options);
export function optimize(root, options) {
    if (!root) return;
    isPlatformReservedTag = options.isReservedTag;
    // first pass: mark all non-static nodes.
    markStatic(root);
    // second pass: mark static roots.
    markStaticRoots(root);
}
```

`optimize` 函数分为两步，第一步就是找出所有的静态节点 `markStatic`，第二步是在第一步的基础上找到静态根节点 `markStaticRoots`。

看一下 `markStatic` 的实现：

```js
function markStatic(node) {
    node.static = isStatic(node);
    if (node.type === 1) {
        if (!isPlatformReservedTag(node.tag)) {
            return;
        }
        for (let i = 0, l = node.children.length; i < l; i++) {
            const child = node.children[i];
            markStatic(child);
            if (!child.static) {
                node.static = false;
            }
        }
    }
}
```

首先调用了 `isStatic` 函数标记当前 `node` 。

```js
function isStatic(node) {
    if (node.type === 2) {
        // expression
        return false;
    }
    if (node.type === 3) {
        // text
        return true;
    }
    return isPlatformReservedTag(node.tag);
}
```

如果是一个正常的节点默认就会标记为 `isPlatformReservedTag(node.tag)` 返回的 `true` 。

接下来会调用 `for` 循环判断子节点的情况，如果子节点存在非 `static` 的节点，当前节点会修正为 `false`。

```js
for (let i = 0, l = node.children.length; i < l; i++) {
  const child = node.children[i];
  markStatic(child);
  if (!child.static) {
    node.static = false;
  }
}
```

接下来是第二步，标记静态根节点 `markStaticRoots` 。

```js
export function optimize(root, options) {
    if (!root) return;
    isPlatformReservedTag = options.isReservedTag;
    // first pass: mark all non-static nodes.
    markStatic(root);
    // second pass: mark static roots.
    markStaticRoots(root);
}
function markStaticRoots(node) {
    if (node.type === 1) {
        // For a node to qualify as a static root, it should have children that
        // are not just static text. Otherwise the cost of hoisting out will
        // outweigh the benefits and it's better off to just always render it fresh.
        if (
            node.static &&
            node.children.length &&
            !(node.children.length === 1 && node.children[0].type === 3)
        ) {
            node.staticRoot = true;
            return;
        } else {
            node.staticRoot = false;
        }
        if (node.children) {
            for (let i = 0, l = node.children.length; i < l; i++) {
                markStaticRoots(node.children[i]);
            }
        }
    }
}
```

因为处理静态节点也是有代价的，渲染的时候需要维护一个静态节点树。如果某个 `dom` 节点仅包含一个文本节点，此时进行 `diff`  其实代价很低，这种情况我们就将 `staticRoot` 置为 `false` ，不把它看成静态节点。

通过调用 `optimize` 函数，我们就可以将下边 `Ast` ：

![image-20220904085345451](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904085345451.png)

标记出静态根节点：

![image-20220904085457342](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904085457342.png)

后边生成 `render` 函数时候我们只会用到  `staticRoot` ，`static` 就用不到了。

## render 代码生成

```js
const ast = parse(template);
const options = {
    isReservedTag,
};
optimize(ast, options);
const code = generate(ast);
```

`optimize` 标记完静态根节点后就调用 `generate` 函数来生成 `render` 函数。

```js
export class CodegenState {
    staticRenderFns;

    constructor() {
        this.staticRenderFns = [];
    }
}

export function generate(ast) {
    const state = new CodegenState();
    const code = genElement(ast, state);
    return {
        render: `with(this){return ${code}}`,
        staticRenderFns: state.staticRenderFns,
    };
}
```

定义了一个 `CodegenState` ，类中保存一些数据，在生成 `code` 的过程中进行传递。

接下来看一下 `genElement` 的实现：

```js
export function genElement(el, state) {
    if (el.staticRoot && !el.staticProcessed) {
        return genStatic(el, state);
    } else {
        // component or element
        let code;
        let data; // 先不考虑

        const children = genChildren(el, state);
        code = `_c('${el.tag}'${
            data ? `,${data}` : "" // data
        }${
            children ? `,${children}` : "" // children
        })`;
        return code;
    }
}
```

首先判断是否是静态根节点并且是否在生成静态根节点的过程中，满足情况的话调用 `genStatic` 函数。

```js
function genStatic(el, state) {
    el.staticProcessed = true;
    state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`);
    return `_m(${state.staticRenderFns.length - 1})`;
}
```

我们将生成的静态节点的 `code`  `push` 到 `staticRenderFns` 中，最终通过 `_m` 函数进行包裹，`_m` 函数后边会讲。

此时会走回 `genElement` 函数中，因为已经将 `staticProcessed` 标记为了 `true` ，因此就会进入 `else` 分支中。

```js
export function genElement(el, state) {
    if (el.staticRoot && !el.staticProcessed) {
        return genStatic(el, state);
    } else {
        // component or element
        let code;
        let data; // 先不考虑

        const children = genChildren(el, state);
        code = `_c('${el.tag}'${
            data ? `,${data}` : "" // data
        }${
            children ? `,${children}` : "" // children
        })`;
        return code;
    }
}
```

调用 `genChilden` 生成子节点的 `code` ，最后将 `tag` 、`data` 、`childern` 传给 `_c` 函数，`_c` 函数后边讲。

来看一下 `genChildren` 。

```js
export function genChildren(el, state) {
    const children = el.children;
    if (children.length) {
        const gen = genNode;
        return `[${children.map((c) => gen(c, state)).join(",")}]`;
    }
}
function genNode(node, state) {
    if (node.type === 1) {
        return genElement(node, state);
    } else {
        return genText(node);
    }
}

export function genText(text) {
    // JSON.stringify 是为了给 text 加双引号，作为参数传给 _v
    return `_v(${JSON.stringify(text.text)})`;
}
```

`for` 循环调用 `genNode` ，如果是 `type === 1` 继续调用 `genElement` ，否则的话调用 `genText` 生成 `text` 节点，这里的 `_v` 函数也后边讲。

通过 `generate` 函数：

```js
export function generate(ast) {
    const state = new CodegenState();
    const code = genElement(ast, state);
    return {
        render: `with(this){return ${code}}`,
        staticRenderFns: state.staticRenderFns,
    };
}
```

对于 `"<div><span>3<5吗</span><span>?</span></div>"` 模版 `generate` 返回的对象如下：

![image-20220904101518701](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904101518701.png)

`_m(0)` 代表取 `staticRenderFns` 的第一个值，`"with(this){return _c('div',[_c('span',[_v(\"3<5吗\")]),_c('span',[_v(\"?\")])])}"` 其实就是 `render` 函数的字符串形式了。

调用 `generate` 函数后，我们只需要通过 `Function` 函数生成最终的 `render` 函数即可。

```js
const code = generate(ast);
const render = new Function(code.render);
```

当然因为 `render` 函数中我们还使用了 `_m、_c、_v` 函数，下边看一下这些函数的实现。

## _c _v _m

### _c

`_c` 其实就是生成一个正常的 `vnode` ，和我们之前在 `render` 中接收到的 `createElement` 其实是同一个函数。

```js
new Vue({
    el: "#root",
    data() {
        return {
            text: "world",
            title: "hello",
        };
    },
    components: { Hello },
    methods: {
        click() {
            this.title = "hello2";
            // this.text = "hello2";
        },
    },
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    // click: this.click,
                },
            },
            [
                createElement("Hello", { props: { title: this.title } }),
                this.text,
            ]
        );
        return test;
    },
});
```

![image-20220904104438247](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904104438247.png)

他们调用的都是 `createElement` 函数。

### _v

这些字母函数都定义在 `src/core/instance/render-helpers/index.js` 中：

![image-20220904104943514](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904104943514.png)

并且挂在了 `Vue` 的原型对象上，这样在 `render` 函数中就可以访问到了。

![image-20220904121526651](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220904121526651.png)

我们来先看一下 `_v` 做了什么。

```js
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}
```

很简单，生成了一个 `text` 的 `VNode` 。

### _m

`_m` 对应 `renderStatic`， 接收一个下标参数，也就是 `staticRenderFns` 对应的位置。

```js
export function renderStatic (
  index
){
  const cached = this._staticTrees || (this._staticTrees = [])
  let tree = cached[index]
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  if (tree) {
    return tree
  }
  // otherwise, render a fresh tree.
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  )
  markStatic(tree, `__static__${index}`, false)
  return tree
}
```

加了一个 `cashed` ，如果缓存没有命中，就调用相应的 `staticRenderFns` 函数来生成 `VNode`，当然 `staticRenderFns` 也会提前调用 `new Function` 将字符串实例化为函数。

上边的 `markStatic(tree, __static__${index}, false)`  函数是将 `VNode` 加上 `isStatic` 标记，这样以后在 `diff` 的过程中可以直接跳过。

```js
function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}
```

## 总

今天是模版编译的最后一步了，第一步是 [模版编译之分词](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E5%88%86%E8%AF%8D.html#%E8%AF%8D%E6%B3%95%E5%88%86%E6%9E%90%E4%B9%8B%E6%9C%89%E9%99%90%E8%87%AA%E5%8A%A8%E6%9C%BA)，第二步是 [模版编译之生成AST](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E7%94%9F%E6%88%90AST.html)，今天是最后一步，遍历 `AST` 包装一些字母函数 `_c`、`_m` 等生成 `render` 函数的字符串，最后通过 `new Function` 来生成 `render` 函数。

因为目前为止我们的模版还没有涉及到变量以及一些 `v-` 指令，所以上边的模版还属于静态模版，引入了 `staticRenderFns` 来生成。未来几篇文章会介绍包含变量的文本、常用的 `v-if`、`v-for` 指令等，一步步完善我们的模版编译。

文章对应源码详见 [vue.windliang.wang/](https://vue.windliang.wang/)。
