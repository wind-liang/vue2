---
title: Vue2剥丝抽茧-响应式系统之数组
categories: 前端
tags:
  - vue2
date: 2022-04-05 18:15:33
---

接 [Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/)、[Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/)，[响应式系统之嵌套 ](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%B5%8C%E5%A5%97.html)、[响应式系统之深度响应](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%B7%B1%E5%BA%A6%E5%93%8D%E5%BA%94.html) 还没有看过的同学需要看一下。

# 场景

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: ["hello"],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};

new Watcher(updateComponent);
data.list = ["hello", "liang"];
```

先可以一分钟思考下会输出什么。

... ...

虽然 `list` 的值是数组，但我们是对 `data.list` 进行整体赋值，所以依旧会触发 `data.list` 的 `set` ，触发 `Watcher` 进行重新执行，输出如下：

![image-20220405184002118](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405184002118.png)

# 场景 2

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: ["hello"],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};
new Watcher(updateComponent);

data.list.push("liang");
```

先可以一分钟思考下会输出什么。

... ...

这次是调用 `push` 方法，但我们对 `push` 方法什么都没做，因此就不会触发 `Watcher` 了。

# 方案

为了让 `push` 还有数组的其他方法也生效，我们需要去重写它们，通过 [代理模式](https://pattern.windliang.wang/posts/%E5%89%8D%E7%AB%AF%E7%9A%84%E8%AE%BE%E8%AE%A1%E6%A8%A1%E5%BC%8F%E7%B3%BB%E5%88%97-%E4%BB%A3%E7%90%86%E6%A8%A1%E5%BC%8F.html)，我们可以将数组的原方法先保存起来，然后执行，并且加上自己额外的操作。

```js
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

/*
export function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true,
    });
}
*/
import { def } from "./util";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        /*****************这里相当于调用了对象 set 需要通知 watcher ************************/
        // 待补充
        /**************************************************************************** */
        return result;
    });
});

```

当调用了数组的 `push` 或者其他方法，就相当于我们之前重写属性的 `set` ，上边待补充的地方需要做的就是通知 `dep` 中的 `Watcher` 。

```js
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

如上边的代码，之前的 `dep` 是通过闭包，每一个属性都有一个各自的 `dep` ，负责收集 `Watcher`  和通知 `Watcher` 。

那么对于数组的话，我们的 `dep` 放到哪里比较简单呢？

回忆一下现在的结构。

```js
const data = {
    list: ["hello"],
};
observe(data);

const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};
new Watcher(updateComponent);
```

上边的代码执行过后会是下图的结构。

![image-20220405200509660](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405200509660.png)

`list` 属性在闭包中拥有了 `Dep` 属性，通过 `new Watcher` ，收集到了包含 `updateCompnent` 函数的 `Watcher`。

同时因为 `list` 的 `value`  `["hello"]` 是数组，也就是对象，通过上篇 [响应式系统之深度响应](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%B7%B1%E5%BA%A6%E5%93%8D%E5%BA%94.html) 我们知道，它也会去调用 `Observer` 函数。

那么，我是不是在 `Observer` 中也加一个  `Dep` 就可以了。

![image-20220405201451179](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405201451179.png)

这样当我们调用数组方法去修改 `['hello']` 的值的时候，去通知 `Observer` 中的 `Dep` 就可以了。

# 收集依赖代码实现

按照上边的思路，完善一下 `Observer` 类。

```js
export class Observer {
    constructor(value) {
        /******新增 *************************/
        this.dep = new Dep();
        /************************************/
      	this.walk(value);
    }

    /**
     * 遍历对象所有的属性，调用 defineReactive
     * 拦截对象属性的 get 和 set 方法
     */
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i]);
        }
    }
}
```

然后在 `get` 中，当前 `Oberver` 中的 `dep` 也去收集依赖。

```js
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
                /******新增 *************************/
                if (childOb) {
                    // 当前 value 是数组，去收集依赖
                    if (Array.isArray(value)) {
                        childOb.dep.depend();
                    }
                }
                /************************************/
            }
            return value;
        },
        set: function reactiveSetter(newVal) {
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

# 通知依赖代码实现

我们已经重写了 `array` 方法，但直接覆盖全局的 `arrray` 方法肯定是不好的，我们可以在 `Observer` 类中去操作，如果当前 `value` 是数组，就去拦截它的 `array` 方法。

这里就回到 `js` 的原型链上了，我们可以通过浏览器自带的 `__proto__` ，将当前对象的原型指向我们重写过的方法即可。

考虑兼容性的问题，如果 `__proto__`  不存在，我们直接将重写过的方法复制给当前对象即可。

```js
import { arrayMethods } from './array' // 上边重写的所有数组方法
/* export const hasProto = "__proto__" in {}; */
export class Observer {
    constructor(value) {
        this.dep = new Dep();
      	/******新增 *************************/
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
        /************************************/
        } else {
            this.walk(value);
        }
    }

    /**
     * 遍历对象所有的属性，调用 defineReactive
     * 拦截对象属性的 get 和 set 方法
     */
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i]);
        }
    }
}
/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment(target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment(target, src, keys) {
    for (let i = 0, l = keys.length; i < l; i++) {
        const key = keys[i];
        def(target, key, src[key]);
    }
}
```

还需要考虑一点，数组方法中我们只能拿到 `value` 值，那么怎么拿到 `value` 对应的 `Observer` 呢。

我们只需要在 `Observe` 类中，增加一个属性来指向自身即可。

```js
export class Observer {
    constructor(value) {
        this.dep = new Dep();
        /******新增 *************************/
        def(value, '__ob__', this)
        /************************************/
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
        } else {
            this.walk(value);
        }
    }
  	...
}
```

回到最开始重写的 `array` 方法中，只需要从 `__ob__` 中拿到 `Dep` 去通知 `Watcher` 即可。

```js
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from "./util";

const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);

const methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        /*****************这里相当于调用了对象 set 需要通知 watcher ************************/
        const ob = this.__ob__;
        // notify change
        ob.dep.notify();
        /**************************************************************************** */
        return result;
    });
});

```

# 测试

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: ["hello"],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};

new Watcher(updateComponent);
data.list.push("liang");
```

这样当调用 `push` 方法的时候，就会触发相应的 `Watcher` 来执行 `updateComponent` 函数了。

当前的依赖就变成了下边的样子：

![image-20220405205545348](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405205545348.png)

# 总

对于数组的响应式我们解决了三个问题，依赖放在哪里、收集依赖和通知依赖。

我们来和普通对象属性进行一下对比。

![image-20220405210847016](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220405210847016.png)

