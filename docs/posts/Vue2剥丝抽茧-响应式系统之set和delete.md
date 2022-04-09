---
title: Vue2剥丝抽茧-响应式系统之set和delete
categories: 前端
tags:
  - vue2
date: 2022-04-08 09:37:33
---

Vue2 源码从零详解系列文章， 还没有看过的同学可能需要看一下之前的，[vue.windliang.wang/](https://vue.windliang.wang/)

# 数组set

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: [1, 2],
};
observe(data);
const updateComponent = () => {
    console.log(data.list);
};

new Watcher(updateComponent);

list[0] = 3;
```

`list[0]` 会触发 `updateComponent` 的重新执行吗？

可以先思考一下。

... ...

答案是否定的，数组我们只能通过重写的 `push`、 `splice` 等方法去触发更新，详见  [Vue2剥丝抽茧-响应式系统之数组](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%95%B0%E7%BB%84.html)。

如果我们想要替换数组某个元素的话可以转一下弯，通过 `splice` 去实现。

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: [1, 2],
};
observe(data);
const updateComponent = () => {
    console.log(data.list);
};

new Watcher(updateComponent);

// list[0] = 3;
data.list.splice(0, 1, 3);
```

每次这样写太麻烦了，我们可以提供一个 `set` 方法供用户使用。

```js
/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target, key, val) {
    if (Array.isArray(target)) {
        target.length = Math.max(target.length, key);
        target.splice(key, 1, val);
        return val;
    }

    // targe 是对象的情况
    // ...
}
```

然后我们直接使用 `set` 方法就可以了。

```js
import { observe, set } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: [1, 2],
};
observe(data);
const updateComponent = () => {
    console.log(data.list);
};

new Watcher(updateComponent);

// list[0] = 3;
// data.list.splice(0, 1, 3);
set(data.list, 0, 3);
```

# 数组 del

同数组 `set` ，我们顺便提供一个 `del` 的方法，支持数组响应式的删除某个元素。

```js
/**
 * Delete a property and trigger change if necessary.
 */
export function del(target, key) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.splice(key, 1);
        return;
    }
    // targe 是对象的情况
    // ...
}

```

# 对象 set

```js
import { observe, set, del } from "./reactive";
import Watcher from "./watcher";
const data = {
    obj: {
        a: 1,
        b: 2,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

new Watcher(updateComponent);

data.obj.c = 3;
```

`updateComponent` 方法中虽然使用了 `obj` 的 `c` 属性，但是在调用 `observe` 之前，`data.obj` 中并没有 `c` 属性，所以 `c` 属性不是响应式的。

当我们修改 `data.obj.c` 的值的时候，并不会触发 `updateComponent` 的执行。

如果想要变成响应式的话，一种方法就是在最开始就定义  `c` 属性。

```js
const data = {
    obj: {
        a: 1,
        b: 2,
        c: null,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

new Watcher(updateComponent);

data.obj.c = 3;
```

另一种方法就是通过 `set` 去设置新的属性了，在 `set`  中我们可以将新添加的属性设置为响应式的。

```js
/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set(target, key, val) {
    if (Array.isArray(target)) {
        target.length = Math.max(target.length, key);
        target.splice(key, 1, val);
        return val;
    }

    // targe 是对象的情况
    // key 在 target 中已经存在
    if (key in target && !(key in Object.prototype)) {
        target[key] = val;
        return val;
    }

    const ob = target.__ob__;
    // target 不是响应式数据
    if (!ob) {
        target[key] = val;
        return val;
    }
  	// 将当前 key 变为响应式的
    defineReactive(target, key, val);
    return val;
}
```

回到我们之前的程序：

```js
import { observe, set, del } from "./reactive";
import Watcher from "./watcher";
const data = {
    obj: {
        a: 1,
        b: 2,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

const ob = new Watcher(updateComponent);

set(data.obj, "c", 3);
```

虽然通过 `set` 增加了属性，但是此时 `Watcher` 并不会重新触发，原因的话我们看下依赖图。

![image-20220409102100995](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220409102100995.png)

虽然属性 `c` 拥有了 `Dep` 对象，但由于没有调用过依赖属性 `c` 的 `Watcher` ，所以它并没有收集到依赖。

当然我们可以 `set` 完手动调用一次相应的 `Watcher` 。

```js
const data = {
    obj: {
        a: 1,
        b: 2,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

const ob = new Watcher(updateComponent);

set(data.obj, "c", 3);
ob.update(); // 手动调用 Watcher

data.obj.c = 4;
```

这样的话，当执行 `data.obj.c = 4` 的时候就会触发 `Watcher` 的执行了。

那么我们能将触发相应的 `Watcher` 的逻辑放到 `set` 函数中吗？

![image-20220409102100995](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220409102100995.png)

可以看到 `obj` 里也有个 `Dep`，这个其实当时是为数组准备的，参考 [Vue2剥丝抽茧-响应式系统之数组](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%95%B0%E7%BB%84.html)，但 `obj` 的 `dep` 什么都没收集。

我们修改一下代码让它也收集一下：

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
                if (childOb) {
                  	/******新位置 *************************/
                		childOb.dep.depend();
                  	/**********************************/
                    if (Array.isArray(value)) {
                       // childOb.dep.depend(); //原来的位置
                        dependArray(value);
                    }
                }
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
            childOb = !shallow && observe(newVal);
            dep.notify();
        },
    });
}

function dependArray(value) {
    for (let e, i = 0, l = value.length; i < l; i++) {
        e = value[i];
      	/******新位置 *************************/
        e && e.__ob__ && e.__ob__.dep.depend();
      	/**********************************/
        if (Array.isArray(e)) {
           //  e && e.__ob__ && e.__ob__.dep.depend(); // 原位置
            dependArray(e);
        }
    }
}
```

因为读取 `a` 属性，一定先会读取 `obj` 属性，即 `data.obj.a`。`b` 也同理。

所以通过上边的修改，`obj` 的 `dep` 会收集到它的所有属性的依赖，也就是这里的 `a`、`b` 的依赖，但因为 `a` 和 `b` 的依赖是相同的，所以收集到一个依赖。

![image-20220409104705075](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220409104705075.png)

但其实我们并不知道 `c` 被哪些 `Watcher` 依赖，我们只知道和 `c` 同属于一个对象的 `a` 和 `b` 被哪些 `Watcher` 依赖，但大概率 `c` 也会被其中的 `Watcher` 依赖。

所以我们可以在 `set` 中手动执行一下  `obj` 的 `Dep` ，依赖 `c` 的 `Watcher` 大概率会被执行，相应的 `c` 也会成功收集到依赖。

```js
export function set(target, key, val) {
    if (Array.isArray(target)) {
        target.length = Math.max(target.length, key);
        target.splice(key, 1, val);
        return val;
    }

    // targe 是对象的情况
    // key 在 target 中已经存在
    if (key in target && !(key in Object.prototype)) {
        target[key] = val;
        return val;
    }

    const ob = target.__ob__;
    // target 不是响应式数据
    if (!ob) {
        target[key] = val;
        return val;
    }
    defineReactive(target, key, val);
   /******新增 *************************/
    ob.dep.notify() 
    /************************************/
    return val;
}
```

回到最开始的代码：

```js
const data = {
    obj: {
        a: 1,
        b: 2,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

const ob = new Watcher(updateComponent);

set(data.obj, "c", 3);
```

执行完后 `c` 除了变为响应式的，也成功触发了 `Watcher` 执行，并且收集到了 `Watcher`。

![image-20220409105217629](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220409105217629.png)

此时如果修改 `c` 的值，也会成功触发 `Watcher` 的执行了。

# 对象 del

有了上边的了解，删除就很好解决了。

![image-20220409105217629](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220409105217629.png)

如果要删除 `a` 属性，删除后执行下它相应的 `Dep` 就可以。但 `a` 的 `Dep` 是存在闭包中的，我们并不能拿到。

退而求其次，我们可以去执行 `a` 属性所在的对象 `obj` 的 `Dep` 就可以了。

```js
/**
 * Delete a property and trigger change if necessary.
 */
export function del(target, key) {
    if (Array.isArray(target)) {
        target.splice(key, 1);
        return;
    }
    // targe 是对象的情况
    const ob = target.__ob__;
    if (!hasOwn(target, key)) {
        return;
    }
    delete target[key];
    if (!ob) {
        return;
    }
    ob.dep.notify();
}
```

# 总

通过为对象收集依赖，将对象、数组的修改、删除也变成响应式的了，同时为用户提供了 `set` 和 `del` 方法。
