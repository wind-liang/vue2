---
title: Vue2剥丝抽茧-响应式系统之watch
categories: 前端
tags:
  - vue2
date: 2022-04-17 08:26:33
---

Vue2 源码从零详解系列文章， 还没有看过的同学可能需要看一下之前的，[vue.windliang.wang/](https://vue.windliang.wang/)

## 场景

```js
import { observe } from "./reactive";
import { initWatch } from "./state";
const options = {
    data: {
        first: {
            text: "hello",
        },
        title: "liang",
    },
    watch: {
        "first.text": function (newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },
        title(newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },
    },
};
observe(options.data);
initWatch(options.data, options.watch);

options.data.first.text = "changeText";

options.data.title = "changeTitle";
```

相信大家在 `Vue` 中一定写过 `watch` ，用来监听 `data` 中的数据变化，回调函数会接收到新值和旧值。

这篇文章来实现 `initWatch` ，因为需要用到 `data` 所以要把 `data` 传入，还有就是 `watch` 也传入。

## 实现思路

之前的文章我们实现了一个 `Watcher` 类。

```js
export default class Watcher {
    constructor(Fn, options) {
        this.getter = Fn;
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        this.id = ++uid; // uid for batching
        // options
        if (options) {
            this.sync = !!options.sync;
        }
        this.get();
    }
  	...
}
```

接收一个函保存到 `getter` 属性中，如果函数中使用了 `data` 中的属性，当 `data` 中对应的属性变化的时候就会再次执行该函数。

```js
run() {
  this.get();
}
```

对于 `watch` ，

```js
watch: {
  "first.text": function (newVal, oldVal) {
    console.log("收到变化", newVal, oldVal);
  },
},
```

我们现在想要监听 `first.text` 的变化，为了触发相应属性的 `get` 来收集 `Watcher` ，我们可以把读取这个值封装为一个函数，传给 `Watcher` 。

```js
new Watcher(() => options.data.first.text, function (newVal, oldVal) {
    console.log("收到变化", newVal, oldVal);
  })
```

并且将回调函数也传递给 `Watcher` 。

当 `options.data.first.text` 变化的时候，响应式系统会自动执行 `() => options.data.first.text` ，与此同时我们再执行传进来的回调函数即可。

```js
run() {
  const value = this.get();
  // 执行传进来的回调函数
}
```

上边就是关键的思路的了，主要就是两件事情，把属性封装为函数来适配我们之前的 `Watcher` 系统和增加回调函数来手动执行，下边我们来具体实现一下。

## 代码实现

### 属性名包装为函数

之前传入的是 `Fn` ，现在可能传入的是属性名，所以参数名改为 `expOrFn` ，同时将 `data` 传入。

```js
constructor(data, expOrFn, cb, options) {
  this.data = data;
  if (typeof expOrFn === "function") {
    this.getter = expOrFn;
  } else {
    this.getter = parsePath(expOrFn);
  }
  ...
  this.get();
}
```

`parsePath` 就是将属性名封装为一个函数。

```js
/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
export const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * Parse simple path.
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
export function parsePath(path) {
    if (bailRE.test(path)) {
        return;
    }
    const segments = path.split(".");
    return function (obj) {
        for (let i = 0; i < segments.length; i++) {
            if (!obj) return;
            obj = obj[segments[i]];
        }
        return obj;
    };
}
```

`parsePath` 返回了一个函数，该函数接收一个对象，通过循环读取了对象中相应的属性值。

这样在执行的时候，我们需要将 `data` 作为参数传给上述返回的函数。

```js
/**
     * Evaluate the getter, and re-collect dependencies.
     */
get() {
  pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
  let value;
  try {
    /******增加参数 *************************/
    value = this.getter.call(this.data, this.data);
     /************************************/
  } catch (e) {
    throw e;
  } finally {
    popTarget();
    this.cleanupDeps();
  }
  return value;
}
```

### 增加回调函数

我们需要增加一个回调函数，当对应的 `data` 属性改变的时候，同时去执行该回调函数。

首先是构造函数保存相应的回调函数，同时保存函数的求值结果，后边会传给回调函数作为旧值。

```js
export default class Watcher {
    constructor(data, expOrFn, cb, options) {
        this.data = data;
        if (typeof expOrFn === "function") {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
        ...
        this.cb = cb;
        this.value = this.get(); // 回调函数要用到
    }
   ...
}
```

然后在 `run` 的时候去执行回调函数，并且把新值和旧值传给回调函数。

```js

/**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
run() {
  const value = this.get(); // 拿到新值
  if (value !== this.value) {
    // set new value
    const oldValue = this.value;
    this.value = value;
    this.cb.call(this.data, value, oldValue);
  }
}
```

### initWatch 函数

`Watch` 完善后，我们就可以实现 `initWatch` 函数了。

```js
// state.js
import Watcher from "./watcher";
import { pushTarget, popTarget } from "./dep";

export function initWatch(data, watch) {
    for (const key in watch) {
        const handler = watch[key];
        createWatcher(data, key, handler);
    }
}

function createWatcher(data, expOrFn, handler) {
    return $watch(data, expOrFn, handler);
}

function $watch(data, expOrFn, handler) {
    new Watcher(data, expOrFn, handler);
}
```

## 验证

回到开头的代码。

```js
import { observe } from "./reactive";
import { initWatch } from "./state";
const options = {
    data: {
        first: {
            text: "hello",
        },
        title: "liang",
    },
    watch: {
        "first.text": function (newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },
        title(newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },
    },
};
observe(options.data);
initWatch(options.data, options.watch);

options.data.first.text = "changeText";
options.data.title = "changeTitle";
```

此时控制台就会接收到变化并且执行我们的回调函数了：

![image-20220417092629962](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220417092629962.png)

## 扩展

我们的回调函数也可以是一个回调函数数组：

```js
 watch: {
        "first.text": [function (newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },function (newVal, oldVal) {
            console.log("收到变化2", newVal, oldVal);
        }],
 }
```

实现这个功能，我们只需要在 `initWatch` 中循环一下即可。

```js
export function initWatch(data, watch) {
    for (const key in watch) {
        const handler = watch[key];
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
                createWatcher(data, key, handler[i]);
            }
        } else {
            createWatcher(data, key, handler);
        }
    }
}
```

![image-20220417093034260](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220417093034260.png)

## 总

主要利用已有的响应式系统，实现了 `watch` 功能：将属性名封装为函数去读取一次，这样相应的属性就会收集到该 `Watcher` ，属性变化去执行 `Watcher` 的时候同时执行回调函数，将新值和旧值传入。

