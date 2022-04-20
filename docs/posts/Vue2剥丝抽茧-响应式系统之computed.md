---
title: Vue2剥丝抽茧-响应式系统之computed
categories: 前端
tags:
  - vue2
date: 2022-04-19 09:49:33
---

Vue2 源码从零详解系列文章， 还没有看过的同学可能需要看一下之前的，[vue.windliang.wang/](https://vue.windliang.wang/)

# 场景

```js
import { observe } from "./reactive";
import { initComputed } from "./state";
import Watcher from "./watcher";
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
        title: "标题",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
        name2: {
            get() {
                console.log("name2我执行啦！");
                return "name2" + this.firstName + this.secondName;
            },
            set() {
                console.log("name2的我执行啦！set执行啦！");
            },
        },
    },
};
observe(options.data);
initComputed(options.data, options.computed);
```

`Vue` 中肯定少不了 `computed` 属性的使用，`computed` 的最大的作用就是惰性求值，同时它也是响应式数据。

这篇文章主要就来实现上边的 `initComputed` 方法。

# 实现思路

主要做三件事情

1. 惰性的响应式数据
2. 处理 `computed` 的值
3.  `computed` 属性的响应式

## 惰性的响应式数据

回想一下我们之前的 `Watcher` 。

如果我们调用 `new Watcher` 

```js
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);

new Watcher(options.data, options.computed.name);
```

在 `Watcher` 内部我们会立即执行一次 `options.computed.name` 并将返回的值保存起来。

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
        this.value = this.get();
    }
  	/**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call(this.data, this.data);
        } catch (e) {
            throw e;
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value);
            }
            popTarget();
            this.cleanupDeps();
        }
        return value;
    }
```

为了实现惰性求值，我们可以增加一个 `lazy` 属性，构造函数里我们不去直接执行。

同时增加一个 `dirty` 属性，`dirty` 为 `true` 表示 `Watcher` 依赖的属性发生了变化，需要重新求值。`dirty` 为 `false` 表示 `Watcher` 依赖的属性没有发生变化，无需重新求值。

```js
export default class Watcher {
    constructor(data, expOrFn, cb, options) {
        this.data = data;
        if (typeof expOrFn === "function") {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        this.id = ++uid; // uid for batching
        this.cb = cb;
        // options
        if (options) {
            this.deep = !!options.deep;
            this.sync = !!options.sync;
          	/******新增 *************************/
            this.lazy = !!options.lazy;
            /************************************/

        }
      	/******新增 *************************/
        this.dirty = this.lazy;
        this.value = this.lazy ? undefined : this.get();
       /************************************/
    }
```

我们把 `computed` 的函数传给 `Watcher` 的时候可以增加一个 `lazy` 属性，`cb` 参数是为了 `watch` 使用，这里就传一个空函数。

```js
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);

const noop = () => {}
const watcher = new Watcher(options.data, options.computed.name, noop, {
    lazy: true,
});
console.log(watcher.value);
```

此时 `wacher.value` 就是 `undefined` 了，没有拿到值。

我们还需要在 `Wacher` 类中提供一个 `evaluate` 方法，供用户手动执行 `Watcher` 所保存的 `computed` 函数。

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
        // options
        if (options) {
            this.deep = !!options.deep;
            this.sync = !!options.sync;
            this.lazy = !!options.lazy;
        }
        this.dirty = this.lazy;
        this.value = this.lazy ? undefined : this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call(this.data, this.data);
        } catch (e) {
            throw e;
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value);
            }
            popTarget();
            this.cleanupDeps();
        }
        return value;
    }

    ...

    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    /******新增 *************************/
    evaluate() {
        this.value = this.get();
        this.dirty = false; // dirty 为 false 表示当前值已经是最新
    }
		/**********************************/
}

```

输出 `value` 之前我们可以先执行一次 `evaluate` 。

```js
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);

const noop = () => {};
const watcher = new Watcher(options.data, options.computed.name, noop, {
    lazy: true,
});
console.log(watcher.value);
watcher.evaluate();
console.log(watcher.value);
```

输出结果如下：

![image-20220420084245239](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420084245239.png)

我们解决了初始时候的惰性，但如果去修改 `firstName` 的值，`Watcher` 还会立即执行，如下所示：

```js
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);

const noop = () => {};
const watcher = new Watcher(options.data, options.computed.name, noop, {
    lazy: true,
});
console.log(watcher.value);
watcher.evaluate();
console.log(watcher.value);

console.log("修改 firstName 的值");
options.data.firstName = "wind2";
setTimeout(() => {
    console.log(watcher.value);
}); // 为什么用 setTimeout 参考 https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8BnextTick.html
```

输出如下：

![image-20220420085931210](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420085931210.png)

因此，当触发 `Watcher` 执行的时候，我们应该只将 `dirty` 置为 `true` 而不去执行。

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
        this.dirty = this.lazy;
        this.value = this.lazy ? undefined : this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        pushTarget(this); // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call(this.data, this.data);
        } catch (e) {
            throw e;
        } finally {
            // "touch" every property so they are all tracked as
            // dependencies for deep watching
            if (this.deep) {
                traverse(value);
            }
            popTarget();
            this.cleanupDeps();
        }
        return value;
    }
    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
    update() {
       /******新增 *************************/
        if (this.lazy) {
            this.dirty = true;
          /************************************/
        } else if (this.sync) {
            this.run();
        } else {
            queueWatcher(this);
        }
    }
  
```

这样，在使用 `name` 值前，我们先判断下 `dirty` ，如果 `dirty` 为 `true` ，先手动调用 `evaluate` 方法进行求值，然后再使用。

```js
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);

const noop = () => {};
const watcher = new Watcher(options.data, options.computed.name, noop, {
    lazy: true,
});
console.log(watcher.value);
watcher.evaluate();
console.log(watcher.value);

console.log("修改 firstName 的值");
options.data.firstName = "wind2";
setTimeout(() => {
    if (watcher.dirty) {
        watcher.evaluate();
    }
    console.log(watcher.value);
}); // 为什么用 setTimeout 参考 https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8BnextTick.html
```

## 处理 `computed` 的值

接下来就是 `initComputed` 的逻辑，主要就是结合上边所讲的，将传进来的 `computed` 转为惰性的响应式数据。

```js
export function noop(a, b, c) {}

const computedWatcherOptions = { lazy: true };

// computed properties are just getters during SSR
export function initComputed(data, computed) {
    const watchers = (data._computedWatchers = Object.create(null)); // 保存当前所有的 watcher，并且挂在 data 上供后边使用

    for (const key in computed) {
        const userDef = computed[key];
        const getter = typeof userDef === "function" ? userDef : userDef.get; // 如果是对象就取 get 的值
        // create internal watcher for the computed property.
        watchers[key] = new Watcher(
            data,
            getter || noop,
            noop,
            computedWatcherOptions
        );

        // component-defined computed properties are already defined on the
        // component prototype. We only need to define computed properties defined
        // at instantiation here.
        defineComputed(data, key, userDef);
    }
}
```

上边的 `defineComputed` 主要就是将 `computed` 函数定义为 `data` 的属性，这样就可以像正常属性一样去使用 `computed` 。

```js
const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop,
};
export function defineComputed(target, key, userDef) {
    // 初始化 get 和 set
    if (typeof userDef === "function") {
        sharedPropertyDefinition.get = createComputedGetter(key);
        sharedPropertyDefinition.set = noop;
    } else {
        sharedPropertyDefinition.get = userDef.get
            ? createComputedGetter(key)
            : noop;
        sharedPropertyDefinition.set = userDef.set || noop;
    }
    // 将当前属性挂到 data 上
    Object.defineProperty(target, key, sharedPropertyDefinition);
}

```

其中 `createComputedGetter` 中去完成我们手动更新 `Watcher` 值的逻辑。

```js
function createComputedGetter(key) {
    return function computedGetter() {
        const watcher = this._computedWatchers && this._computedWatchers[key]; // 拿到相应的 watcher
        if (watcher) {
            if (watcher.dirty) {
                watcher.evaluate();
            }
            return watcher.value;
        }
    };
}
```

让我们测试一下 ` initComputed` 。

```js
import { observe } from "./reactive";
import { initComputed } from "./state";
import Watcher from "./watcher";
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
        title: "标题",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
        name2: {
            get() {
                console.log("name2我执行啦！");
                return "name2" + this.firstName + this.secondName;
            },
            set() {
                console.log("name2的我执行啦！set执行啦！");
            },
        },
    },
};
observe(options.data);
initComputed(options.data, options.computed);

const updateComponent = () => {
    console.log("updateComponent执行啦！");
    console.log("我使用了 name2", options.data.name2);
    document.getElementById("root").innerText =
        options.data.name + options.data.title;
};

new Watcher(options.data, updateComponent);
```

分析一下 `updateComponent` 函数执行的逻辑：

* `console.log("我使用了 name2", options.data.name2);` ：

  读取了 `name2` 的值，所以会触发我们定义好的 `get` ，触发 `computed` 中 `name2.get` 函数的执行。

* `document.getElementById("root").innerText = options.data.name + options.data.title;`:

  读取了 `name` 的值，会触发 `computed` 中 `name` 函数的执行。

  读取了  `title` 的值，`data.title` 会收集当前 `Watcher` ，未来 `data.title` 改变的时候，会触发 `updateComponent` 函数的执行。

下边是输出结果：

![image-20220420091914961](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420091914961.png)

此时我们如果修改 `title` 的值，`updateComponent` 函数会重新执行，但因为 `name` 和 `name2` 依赖的属性值并没有发生变化，所以他们相应的函数就不会执行了。

![image-20220420092134386](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420092134386.png)



## computed 属性的响应式

思考下边的场景：

```js
import { observe } from "./reactive";
import { initComputed } from "./state";
import Watcher from "./watcher";
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
        title: "标题",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);
initComputed(options.data, options.computed);

const updateComponent = () => {
    console.log("updateComponent执行啦！");
    document.getElementById("root").innerText =
        options.data.name + options.data.title;
};

new Watcher(options.data, updateComponent);

setTimeout(() => {
    options.data.firstName = "wind2";
}, 1000); // 为什么用 setTimeout 参考 https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8BnextTick.html
```

当我们修改了 `firstName` 的值，毫无疑问，`name` 和 `name2` 的值肯定也会变化，使用了 `name` 和 `name2` 的函数 `updateComponent` 此时也应该执行。

但事实上只在第一次的时候执行了，并没有二次触发。

![image-20220420093442962](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420093442962.png)

让我们看一下当前的收集依赖图：

![image-20220420094032444](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420094032444.png)

`title` 属性收集了包含 `updateComponent` 函数的 `Watcher` ，`firstName` 和 `secondName` 属性都收集了包含 `computed.name()` 函数的 `Watcher`。

`name` 属性是我们后边定义的，没有 `Dep` 类，什么都没有收集。

我们现在想要实现改变 `firstName` 或者 `secondName` 值的时候，触发 `updateComponent` 函数的执行。

我们只需要读取 `name` 的时候，让 `firstName` 和 `secondName` 收集一下当前的 `Watcher` ，因为读取 `name` 的值是在 `updateComponent` 中执行的，所以当前 `Watcher` 就是包含了 `updateComponent` 函数的 `Watcher` 。

怎么让 `firstName` 和 `secondName` 收集当前的 `Watcher` 呢？

在 `name` 的 `get` 中，我们能拿到 `computed.name()` 对应的 `Watcher` ，而在 `Watcher` 实例中，我们把它所有的依赖都保存起来了，也就是这里的 `firstName` 和 `secondName` ，如下图：

![image-20220420100828571](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420100828571.png)

所以我们只需在 `Watcher` 中提供一个 `depend` 方法， 遍历所有的依赖收集当前 `Watcher` 。

```js
export default class Watcher {
    constructor(data, expOrFn, cb, options) {
        this.data = data;
        if (typeof expOrFn === "function") {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
        ...
        this.dirty = this.lazy;
        this.value = this.lazy ? undefined : this.get();
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
        const id = dep.id;
        // 新的依赖已经存在的话，同样不需要继续保存
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
    }
    /**
     * Evaluate the value of the watcher.
     * This only gets called for lazy watchers.
     */
    evaluate() {
        this.value = this.get();
        this.dirty = false;
    }
  	/******新增 *************************/
    /**
     * Depend on all deps collected by this watcher.
     */
    depend() {
        let i = this.deps.length;
        while (i--) {
            this.deps[i].depend();
        }
    }
   /************************************/
}

```

然后在之前定义的计算属性的 `get` 中触发收集依赖即可。

```js
function createComputedGetter(key) {
    return function computedGetter() {
        const watcher = this._computedWatchers && this._computedWatchers[key];
        if (watcher) {
            if (watcher.dirty) {
                watcher.evaluate();
            }
            if (Dep.target) {
                watcher.depend();
            }
            return watcher.value;
        }
    };
}
```

回到开头的场景：

```js
import { observe } from "./reactive";
import { initComputed } from "./state";
import Watcher from "./watcher";
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
        title: "标题",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },
    },
};
observe(options.data);
initComputed(options.data, options.computed);

const updateComponent = () => {
    console.log("updateComponent执行啦！");
    document.getElementById("root").innerText =
        options.data.name + options.data.title;
};

new Watcher(options.data, updateComponent);

setTimeout(() => {
    options.data.firstName = "wind2";
}, 1000);
```

此时修改 `firstName` 的值就会触发 `updateComponent` 函数的执行了。

![image-20220420101247642](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420101247642.png)

此时的依赖图如下：

![image-20220420101629653](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220420101629653.png)

# 总

`computed` 对应的函数作为了一个 `Watcher` ，使用计算属性的函数也是一个 `Watcher` ，`computed` 函数中使用的属性会将这两个 `Watcher` 都收集上。

此外 `Watcher` 增加了 `lazy` 属性，如果 `lazy` 为 `true`，当触发 `Watcher` 执行的时候不执行内部的函数，将函数的执行让渡给外部管理。

需要注意的一点是，我们是将 `computed` 所有的 `watcher` 都挂在了 `data` 上，实际上 `Vue` 中是挂在当前的组件实例上的。





