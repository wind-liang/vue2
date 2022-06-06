---
title: Vue2剥丝抽茧-响应式系统
categories: 前端
tags:
  - vue2
date: 2022-03-27 15:14:19
---

目前工作中大概有 `40%` 的需求是在用 `Vue2` 的技术栈，所谓知其然更要知其所以然，为了更好的使用 `Vue` 、更快的排查问题，最近学习了源码相关的一些知识，虽然网上总结 `Vue` 的很多很多了，不少自己一个，但也不多自己一个，欢迎一起讨论学习，发现问题欢迎指出。

## 响应式系统要干什么

回到最简单的代码：

```js
data = {
    text: 'hello, world'
}

const updateComponent = () => {
    console.log('收到', data.text);
}

updateComponent()

data.text = 'hello, liang'
// 运行结果
// 收到 hello, world
```

响应式系统要做的事情：某个依赖了 `data` 数据的函数，当所依赖的 `data` 数据改变的时候，该函数要重新执行。

我们期望的效果：当上边 `data.text` 修改的时候， `updateComponent` 函数再执行一次。

为了实现响应式系统，我们需要做两件事情：

1. 知道 `data` 中的数据被哪些函数依赖

2. `data` 中的数据改变的时候去调用依赖它的函数们

为了实现第 `1` 点，我们需要在执行函数的时候，将当前函数保存起来，然后在**读取数据**的时候将该函数保存到当前数据中。

第 `2` 点就迎刃而解了，当**修改数据**的时候将保存起来的函数执行一次即可。

在**读取数据**和**修改数据**的时候需要做额外的事情，我们可以通过 `Object.defineProperty()`  重写对象属性的 `get` 和 `set` 函数。

## 响应式数据

我们来写一个函数，重写属性的 `get` 和 `set` 函数。

```js
/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val) {
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            /*********************************************/
            // 1.这里需要去保存当前在执行的函数
            /*********************************************/
            return value;
        },
        set: function reactiveSetter(newVal) {
            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
            /*********************************************/
            // 2.将依赖当前数据依赖的函数执行
            /*********************************************/
        },
    });
}
```

为了调用更方便，我们把第 `1` 步和第 `2` 步的操作封装一个 `Dep`  类。

```js
export default class Dep {
    static target; //当前在执行的函数
    subs; // 依赖的函数
    constructor() {
        this.subs = []; // 保存所有需要执行的函数
    }

    addSub(sub) {
        this.subs.push(sub);
    }

    depend() {
        // 触发 get 的时候走到这里
        if (Dep.target) {
            // 委托给 Dep.target 去调用 addSub
            Dep.target.addDep(this);
        }
    }

    notify() {
        for (let i = 0, l = this.subs.length; i < l; i++) {
            this.subs[i].update();
        }
    }
}

Dep.target = null; // 静态变量，全局唯一
```

我们将当前执行的函数保存到 `Dep` 类的 `target` 变量上。

## 保存当前正在执行的函数

为了保存当前的函数，我们还需要写一个 `Watcher` 类，将需要执行的函数传入，保存到 `Watcher` 类中的 `getter` 属性中，然后交由 `Watcher` 类负责执行。

这样在 `Dep` 类中， `subs` 中保存的就不是当前函数了，而是持有当前函数的 `Watcher` 对象。

```js
import Dep from "./dep";
export default class Watcher {
    constructor(Fn) {
        this.getter = Fn;
        this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        Dep.target = this; // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
          	// 调用当前传进来的函数，触发对象属性的 get
            value = this.getter.call();
        } catch (e) {
            throw e;
        }
        return value;
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
      	// 触发 get 后会走到这里，收集当前依赖
        // 当前正在执行的函数的 Watcher 保存到 dep 中的 subs 中
        dep.addSub(this);
    }

    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
  	// 修改对象属性值的时候触发 set，走到这里
    update() {
        this.run();
    }

    /**
     * Scheduler job interface.
     * Will be called by the scheduler.
     */
    run() {
        this.get();
    }
}

```

`Watcher` 的作用就是将正在执行的函数通过 `Watcher` 包装后保存到 `Dep.target` 中，然后调用传进来的函数，此时触发对象属性的 `get` 函数，会收集当前 `Watcher` 。

如果未来修改对象属性的值，会触发对象属性的 `set` ，接着就会调用之前收集到的 `Watcher` 对象，通过 `Watcher` 对象的 `uptate` 方法，来调用最初执行的函数。

## 响应式数据

回到我们之前没写完的 `defineReactive` 函数，按照上边的思路，我们来补全一下。

```js
import Dep from "./dep";
/**
 * Define a reactive property on an Object.
 */
export function defineReactive(obj, key, val) {
    const property = Object.getOwnPropertyDescriptor(obj, key);
    // 读取用户可能自己定义了的 get、set
    const getter = property && property.get;
    const setter = property && property.set;
    // val 没有传进来话进行手动赋值
    if ((!getter || setter) && arguments.length === 2) {
        val = obj[key];
    }

    /*********************************************/
    const dep = new Dep(); // 持有一个 Dep 对象，用来保存所有依赖于该变量的 Watcher
    /*********************************************/

    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
            const value = getter ? getter.call(obj) : val;
            /*********************************************/
            // 1.这里需要去保存当前在执行的函数
            if (Dep.target) {
                dep.depend();
            }
            /*********************************************/
            return value;
        },
        set: function reactiveSetter(newVal) {
            if (setter) {
                setter.call(obj, newVal);
            } else {
                val = newVal;
            }
            /*********************************************/
            // 2.将依赖当前数据依赖的函数执行
            dep.notify();
            /*********************************************/
        },
    });
}

```

## Observer 对象

我们再写一个 `Observer` 方法，把对象的全部属性都变成响应式的。

```js
export class Observer {
    constructor(value) {
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

我们提供一个 `observe` 方法来负责创建 `Observer` 对象。

```js
export function observe(value) {
    let ob = new Observer(value);
    return ob;
}
```

## 测试

将上边的方法引入到文章最开头的例子，来执行一下：

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
};
// 将数据变成响应式的
observe(data);

const updateComponent = () => {
    console.log("收到", data.text);
};

// 当前函数由 Watcher 进行执行
new Watcher(updateComponent);

data.text = "hello, liang";
```

此时就会输出两次了~

```js
收到 hello, world
收到 hello, liang
```

说明我们的响应式系统成功了。

## 总

![image-20220329092722630](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220329092722630.png)

先从整体理解了响应式系统的整个流程：

每个属性有一个 `subs` 数组，`Watcher` 会持有当前执行的函数，当读取属性的时候触发 `get` ，将当前 `Watcher` 保存到 `subs` 数组中，当属性值修改的时候，再通过 `subs` 数组中的 `Watcher` 对象执行之前保存的函数。

当然还有亿点点细节需要完善，后边的文章会继续。
