---
title: Vue2剥丝抽茧-响应式系统之深度响应
categories: 前端
tags:
  - vue2
date: 2022-04-05 11:12:33
---

接 [Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/)、[Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/)，[响应式系统之嵌套 ](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%B5%8C%E5%A5%97.html)还没有看过的同学需要看一下。

# 场景

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: {
        innerText: {
            childText: "hello",
        },
    },
};
observe(data);
const updateComponent = () => {
    console.log(data.text.innerText.childText);
};

new Watcher(updateComponent);
data.text.innerText.childText = "liang";
```

我们的响应式系统到现在还没有支持属性是对象时候的响应，因此我们改变 `childText` 的时候不会有任何输出。

我们只收集了 `data.text` 的依赖，所以如果想要响应的话必须给 `data.text` 整个赋值为一个新对象。

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: {
        innerText: {
            childText: "hello",
        },
    },
};
observe(data);
const updateComponent = () => {
    console.log(data.text.innerText.childText);
};

new Watcher(updateComponent);
data.text = {
    innerText: {
        childText: "liang",
    },
};
```

![image-20220405115503890](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405115503890.png)

我们当然不希望每次都赋值整个对象，我们需要做一些修改，把嵌套的对象也变成响应式的。

# 方案

我们只需要在给某个 `key` 重写 `get` 和 `set` 之前，把它的 `value` 就像上边给 `data` 调用 `observe` 函数一样，也调用一次 `observe` 函数即可。

同时提供 `shallow` 参数，留下扩展，让外界决定是否需要深度响应。

```js
/*******************新增 shallow*******************/
export function defineReactive(obj, key, val, shallow) {
/****************************************************/
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher
    /*******************新增****************************/
    !shallow && observe(val);
  	/******************************************************/
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            if (Dep.target) {
                dep.depend();
            }
            return value;
        },
        set: function reactiveSetter(newVal) {
            const value = getter ? getter.call(obj) : val;

            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
            dep.notify();
        },
    });
}
```

同时，在 `observe` 函数中，传进来的 `value` 不是对象的话我们直接 `return` 。

```js
/*
util.js
export function isObject(obj) {
    return obj !== null && typeof obj === "object";
}
*/
export function observe(value) {
    if (!isObject(value)) {
        return;
    }
    let ob = new Observer(value);
    return ob;
}
```

# 场景2

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: {
        innerText: {
            childText: "hello",
        },
    },
};
observe(data);
const updateComponent = () => {
    console.log(data.text.innerText.childText);
};

new Watcher(updateComponent);

data.text.innerText.childText = "liang";
data.text = {
    innerText: {
        childText: "liang2",
    },
};

data.text.innerText.childText = "liang3";

```

可以一分钟想一下上边会输出什么。

... ...

`new Watcher(updateComponent);` ，执行一次 `updateComponent` 输出 `hello` 。

`data.text.innerText.childText = "liang";` ，我们已经解决了属性是对象的情况，因此这里也会输出 `liang`。

```js
data.text = {
    innerText: {
        childText: "liang2",
    },
};
```

上边代码就是文章最开头的方法，因此也会触发函数执行，输出 `liang2` 。

`data.text.innerText.childText = "liang3";` 最后这句会执行吗？

答案是否定的了，因为我们的 `data.text` 赋值为了一个新对象，但这个新对象我们并没有将其设置为响应式的。

因此我们需要在 `set` 的时候把对象也设置为响应式的。

```js
/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val, shallow) {
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher

    let childOb = !shallow && observe(val);
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            if (Dep.target) {
                dep.depend();
            }
            return value;
        },
        set: function reactiveSetter(newVal) {
            const value = getter ? getter.call(obj) : val;

            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
          /******新增 *************************/
            childOb = !shallow && observe(newVal);
           /************************************/
            dep.notify();
        },
    });
}
```

# 总

通过递归解决了属性是对象的依赖，可以为未来数组的依赖留下基础。
