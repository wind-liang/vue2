---
title: Vue2剥丝抽茧-响应式系统之数组2
categories: 前端
tags:
  - vue2
date: 2022-04-07 06:59:33
---

接 [Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/)、[Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/)，[响应式系统之嵌套 ](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%B5%8C%E5%A5%97.html)、[响应式系统之深度响应](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%B7%B1%E5%BA%A6%E5%93%8D%E5%BA%94.html) 、[Vue2剥丝抽茧-响应式系统之数组](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%95%B0%E7%BB%84.html) 还没有看过的同学需要看一下。

# 场景1

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: [
        {
            text: "hello",
        },
    ],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item.text);
    }
};

new Watcher(updateComponent);

data.list[0].text = "liang";
```

先思考 `1` 分钟，上边会输出什么。

... ...

是的，只会输出一次 `hello`，而 `data.list[0].text = "liang";` 没有触发更新。

没有触发原因是因为我们并没有给 `{text:'hello'}`  变为响应式的。

代码中我们只处理了整个数组，并没有处理数组中的元素，因此需要补一个 `for` 循环来将数组中的对象也变为响应式的。

```js
export class Observer {
    constructor(value) {
        this.dep = new Dep();
        def(value, "__ob__", this);
        if (Array.isArray(value)) {
            if (hasProto) {
                protoAugment(value, arrayMethods);
            } else {
                copyAugment(value, arrayMethods, arrayKeys);
            }
          	/******新增 *************************/
            this.observeArray(value);
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

    /**
     * Observe a list of Array items.
     */
  /******新增 *************************/
    observeArray(items) {
        for (let i = 0, l = items.length; i < l; i++) {
            observe(items[i]);
        }
    }
  /************************************/
}
```

# 场景2

```js
const data = {
    list: [
        ["hello", "wind"],
        ["hello", "liang"],
    ],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};

new Watcher(updateComponent);

data.list.push(["hello"]);

data.list[0].push("update");
```

先思考 `1` 分钟，上边会输出什么。

... ...

现在相当于一个二维数组，第一次运行输出下边的应该没什么疑问：

![image-20220407071836628](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407071836628.png)

每一个数组对象都会有一个 `__ob__` 对象指向自身的 `Observer` 。

`Observer` 对象中有一个 `Dep` 对象来收集依赖。

![image-20220407071949480](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407071949480.png)

再具体的可以回顾下 [Vue2剥丝抽茧-响应式系统之数组](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%95%B0%E7%BB%84.html) 。

那么 `data.list.push(["update"]);` 会触发 `Watcher` 的执行吗？

会的，我们的 `data.list` 已经收集到依赖了。

那么接下来 `data.list[0].push("update");` 会触发 `Watcher` 的执行吗？

并不会， 虽然 `data.list[0]` 这个数组里成功加入了 `update` ，但 `data.list[0]` 没有收集到依赖，所以并不会触发 `Watcher` 执行。

看一下依赖图：

![image-20220407073602311](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407073602311.png)

`list` 是一个数组，包含 `["hello", "wind"]` 和 `["hello", "liang"]` ，通过上边场景 `1` 对数组中的元素进行了响应式处理，所以它们都包含在了 `Observer` 对象中，并且拥有了 `Dep` 对象。

但在 `get` 的时候我们只对 `[["hello", "wind"],["hello", "liang"]]`  这个整体进行了依赖的收集，它们中的数组元素并没有去收集依赖。 

所以如果是数组的话，我们也需要循环数组中的元素，如果元素是数组需要手动进行依赖收集。

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
                if (childOb) {
                    if (Array.isArray(value)) {
                        childOb.dep.depend(); // [["hello", "wind"],["hello", "liang"]]  这个整体进行了依赖的收集
                        /******新增 *************************/
                        dependArray(value); // 循环数组中的元素，如果是数组的话进行依赖收集。
                        /************************************/
                    }
                }
            }
            return value;
        },
      ...
    }
   

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
        e = value[i];
        if (Array.isArray(e)) {
           	e && e.__ob__ && e.__ob__.dep.depend();
            dependArray(e); // 递归进行
        }
    }
}      
```

这样的话，数组中的数组也会收集到当前依赖了。

![image-20220407081215439](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407081215439.png)

# 场景3

```js
const data = {
    list: [
        ["hello", "wind"],
        ["hello", "liang"],
    ],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};

new Watcher(updateComponent);
data.list.push(["hi"]);

data.list[2].push(["liang");
```

如果我们给 `data.list` 新添加了一个数组，然后对这个新数组添加一个元素会触发 `Watcher` 执行吗？

可以先思考 `1` 分钟。

... ...

我们把 `data.list` 打印一下：

![image-20220407080332804](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407080332804.png)

数组整体有一个 `Obserever`，`list[0]` 有一个 `Obeserver`，`list[1]` 有一个 `Obeserver`，但新加入的 `list[2]` 并没有 `Observer`，所以它不是响应式数据，对它进行操作并不会触发 `Watcher` 的执行。

原因在于我们拦截数组 `push` 操作的时候，对新添加的元素没有调用 `observe` 方法去把它变成响应式的，因此这里需要补一下。

```js
/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
    // cache original method
    const original = arrayProto[method];
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        const ob = this.__ob__;
        /******新增 *************************/
        let inserted; // 加添加的元素拿到
        switch (method) {
            case "push":
            case "unshift":
                inserted = args;
                break;
            case "splice":
                inserted = args.slice(2);
                break;
        }
        if (inserted) ob.observeArray(inserted);
        /************************************/
        // notify change
        ob.dep.notify();
        return result;
    });
});
```

其中 `observeArray` 就是我们场景 `1` 添加的函数。可以看到数组中新添加的元素也拥有了 `Observer`。

![image-20220407081035789](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220407081035789.png)

# 总

这篇文章主要解决了两个问题，

如果是数组，需要将数组中的元素进行响应式处理。此外对于新添加的元素也需要进行响应式处理。

收集依赖的时候，需要对数组中的数组进行依赖收集。

如果没有收集到依赖就会造成数据更新了，但没有触发 `Watcher` 执行，写 `Vue` 的时候可能会遇到这个问题。

这里可以思考一个问题，应该能加深一下理解：场景二中我们对于数组中的数组单独去收集依赖了，数组中的普通对象需要手动去收集依赖吗？为什么
