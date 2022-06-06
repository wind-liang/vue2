---
title: Vue2剥丝抽茧-响应式系统之嵌套
categories: 前端
tags:
  - vue2
date: 2022-04-02 08:12:33
---

接 [Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/)、[Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/)，还没有看过的同学需要看一下。

## 场景

在 `Vue` 开发中肯定存在组件嵌套组件的情况，类似于下边的样子。

```html
<!-- parent-component -->
<div>
  <my-component :text="inner"></my-component>
  {{ text }}
<div>

<!-- my-component-->
<div>{{ text }}</div>
```

回到我们之前的响应式系统，模拟一下上边的情况：

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    inner: "内部",
};
observe(data);

const updateMyComponent = () => {
    console.log("子组件收到:", data.inner);
};

const updateParentComponent = () => {
    new Watcher(updateMyComponent);
    console.log("父组件收到：", data.text);
};

new Watcher(updateParentComponent);

data.text = "hello, liang";
```

可以先 `1` 分钟考虑一下上边输出什么？ 

首先回忆一下 `new Watcher` 会做什么操作。

第一步是保存当前函数，然后执行当前函数前将全局的 `Dep.target` 赋值为当前 `Watcher` 对象。

![image-20220402083845476](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220402083845476.png)

接下来执行 `getter` 函数的时候，如果读取了相应的属性就会触发 `get` ，从而将当前 `Watcher` 收集到该属性的  `Dep` 中。

![image-20220402083943606](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220402083943606.png)

## 执行过程

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    inner: "内部",
};
observe(data);

const updateMyComponent = () => {
    console.log("子组件收到:", data.inner);
};

const updateParentComponent = () => {
    new Watcher(updateMyComponent);
    console.log("父组件收到：", data.text);
};

new Watcher(updateParentComponent);

data.text = "hello, liang";
```

我们再一步一步理清一下：

* `new Watcher(updateParentComponent);`

  将 `Dep.target` 赋值为保存了 `updateParentComponent` 函数的 `Watcher` 。

  接下来执行  `updateParentComponent` 函数。

* `new Watcher(updateMyComponent);`

  将 `Dep.target` 赋值为保存了 `updateMyComponent` 函数的 `Watcher` 。

  接下来执行  `updateMyComponent` 函数。

* ```js
  const updateMyComponent = () => {
      console.log("子组件收到:", data.inner);
  };
  
  // 读取了 inner 变量。
  // data.inner 的 Dep 收集当前 Watcher（保存了 `updateMyComponent` 函数）
  ```

* ```js
  const updateParentComponent = () => {
      new Watcher(updateMyComponent);
      console.log("父组件收到：", data.text);
  };
  // 读取了 text 变量。
  // data.text 的 Dep 收集当前 Watcher （保存了 `updateMyComponent` 函数）
  ```
  
* `data.text = "hello, liang";`
  
  触发 `text` 的 `set` 函数，执行它依赖的 `Watcher` ，而此时是 `updateMyComponent` 函数。

所以上边代码最终输出的结果是：

```js
子组件收到: 内部  // new Watcher(updateMyComponent); 时候输出
父组件收到： hello, world // new Watcher(updateParentComponent); 时候输出
子组件收到: 内部 // data.text = "hello, liang"; 输出
```

然而子组件并不依赖 `data.text`，依赖 `data.text` 的父组件反而没有执行。

# 修复

上边的问题出在我们保存当前正在执行 `Watcher` 时候使用的是单个变量 `Dep.target = null; // 静态变量，全局唯一`。

回忆一下学习 `C`  语言或者汇编语言的时候对函数参数的处理：

```js
function b(p) {
    console.log(p);
}

function a(p) {
    b("child");
    console.log(p);
}

a("parent");
```

当函数发生嵌套调用的时候，执行 `a` 函数的时候我们会先将参数压入栈中，然后执行 `b` 函数，同样将参数压入栈中，`b` 函数执行完毕就将参数出栈。此时回到 `a` 函数就能正确取到 `p` 参数的值了。

对应于 `Watcher` 的收集，我们同样可以使用一个栈来保存，执行函数前将 `Watcher` 压入栈，执行函数完毕后将 `Watcher` 弹出栈即可。其中，`Dep.target` 始终指向栈顶 `Watcher` ，代表当前正在执行的函数。

回到 `Dep` 代码中，我们提供一个压栈和出栈的方法。

```js
import { remove } from "./util";

let uid = 0;

export default class Dep {
    ... 省略
}
Dep.target = null; // 静态变量，全局唯一

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
const targetStack = [];

export function pushTarget(target) {
    targetStack.push(target);
    Dep.target = target;
}

export function popTarget() {
    targetStack.pop();
    Dep.target = targetStack[targetStack.length - 1]; // 赋值为栈顶元素
}
```

然后 `Watcher` 中，执行函数之前进行入栈，执行后进行出栈。

```js
import { pushTarget, popTarget } from "./dep";
export default class Watcher {
    constructor(Fn) {
        this.getter = Fn;
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
      /************修改的地方*******************************/
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
       /*******************************************/
        let value;
        try {
            value = this.getter.call();
        } catch (e) {
            throw e;
        } finally {
          /************修改的地方*******************************/
            popTarget();
          /*******************************************/
            this.cleanupDeps();
        }
        return value;
    }
   ...
}
```

# 测试

回到开头的场景，再来执行一下：

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    inner: "内部",
};
observe(data);

const updateMyComponent = () => {
    console.log("子组件收到:", data.inner);
};

const updateParentComponent = () => {
    new Watcher(updateMyComponent);
    console.log("父组件收到：", data.text);
};

new Watcher(updateParentComponent);

data.text = "hello, liang";
```

执行 `new Watcher(updateParentComponent);` 的时候将 `Watcher` 入栈。

<img src="https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220402093847759.png" alt="image-20220402093847759" style="width:50%;" />

进入 `updateParentComponent` 函数，执行 `new Watcher(updateMyComponent);` 的时候将 `Watcher` 入栈。

<img src="https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220402093937896.png" alt="image-20220402093937896" style="width:50%;" />

执行 `updateMyComponent` 函数，`data.inner` 收集当前 `Dep.target` ，执行完毕后 `Watcher` 出栈。

<img src="https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220402093847759.png" alt="image-20220402093847759" style="width:50%;" />

继续执行 `updateParentComponent` 函数，`data.text` 收集当前 `Dep.target` 。

此时依赖就变得正常了，`data.text` 会触发 `updateParentComponent` 函数，从而输出如下：

```js
子组件收到: 内部
父组件收到： hello, world
子组件收到: 内部
父组件收到： hello, liang
```

## 总结

今天这个相对好理解一些，通过栈解决了嵌套调用的情况。



