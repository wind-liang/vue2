---
title: Vue2剥丝抽茧-响应式系统之分支切换
categories: 前端
tags:
  - vue2
date: 2022-03-31 07:25:57
---

接上篇：[Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/) ，没看的同学需要先看一下。

# 场景

我们考虑一下下边的代码会输出什么。

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    ok: true,
};
observe(data);

const updateComponent = () => {
    console.log("收到", data.ok ? data.text : "not");
};

new Watcher(updateComponent); // updateComponent 执行一次函数，输出 hello, world

data.ok = false; // updateComponent 执行一次函数，输出 not

data.text = "hello, liang"; // updateComponent 会执行吗？
```

我们来一步一步理清：

## `observer(data)` 

拦截了 `data` 中 `text` 和 `ok` 的 `get、set`，并且各自初始化了一个 `Dep` 实例，用来保存依赖它们的 `Watcher` 对象。

![image-20220331073954801](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331073954801.png)

## `new Watcher(updateComponent);` 

这一步会执行 `updateComponent` 函数，执行过程中用到的所有对象属性，会将 `Watcher` 收集到相应对象属性中的`Dep` 中。

![image-20220331074904131](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331074904131.png)

当然这里的 `Watcher` 其实是同一个，所以用了指向的箭头。

## `data.ok = false;` 

这一步会触发 `set` ，从而执行 `Dep` 中所有的 `Watcher` ，此时就会执行一次 `updateComponent` 。

执行 `updateComponent` 就会重新读取 `data` 中的属性，触发 `get`，然后继续收集 `Watcher` 。

![image-20220331080258402](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331080258402.png)

重新执行  `updateComponent` 函数 的时候：

```js
const updateComponent = () => {
    console.log("收到", data.ok ? data.text : "not");
};
```

因为 `data.ok` 的值变为 `false` ，所以就不会触发 `data.text` 的 `get` ，`text` 的 `Dep` 就不会变化了。

而 `data.ok` 会继续执行，触发 `get` 收集 `Watcher` ，但由于我们 `Dep` 中使用的是数组，此时收集到的两个 `Wacher` 其实是同一个，这里是有问题，会导致 `updateComponent` 重复执行，一会儿我们来解决下。

## `data.text = "hello, liang";` 

执行这句的时候，会触发 `text` 的 `set`，所以会执行一次 `updateComponent` 。但从代码来看 `updateComponent` 函数中由于 `data.ok` 为 `false`，`data.text` 对输出没有任何影响，这次执行其实是没有必要的。

之所以执行了，是因为第一次执行  `updateComponent`  读取了 `data.text` 从而收集了 `Watcher` ，第二次执行 ` updateComponent` 的时候，`data.text` 虽然没有读到，但之前的 `Watcher` 也没有清除掉，所以这一次改变 `data.text` 的时候  `updateComponent`  依旧会执行。

所以我们需要的就是当重新执行 `updateComponent` 的时候，如果 `Watcher` 已经不依赖于某个 `Dep` 了，我们需要将当前 `Watcher` 从该 `Dep` 中移除掉。

![image-20220331081754535](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331081754535.png)

# 问题

总结下来我们需要做两件事情。

1. 去重，`Dep` 中不要重复收集 `Watcher` 。
2. 重置，如果该属性对 `Dep` 中的 `Wacher` 已经没有影响了（换句话就是，`Watcher` 中的 `updateComponent` 已经不会读取到该属性了
   ），就将该 `Watcher` 从该属性的 `Dep` 中删除。

# 去重

去重的话有两种方案：

1. `Dep` 中的 `subs` 数组换为 `Set`。
2. 每个 `Dep` 对象引入 `id` ，`Watcher` 对象中记录所有的 `Dep` 的 `id`，下次重新收集依赖的时候，如果 `Dep` 的 `id` 已经存在，就不再收集该 `Watcher` 了。

`Vue2` 源码中采用的是方案 `2` 这里我们实现下：

`Dep` 类的话只需要引入 `id` 即可。

```js
/*************改动***************************/
let uid = 0;
/****************************************/
export default class Dep {
    static target; //当前在执行的函数
    subs; // 依赖的函数
  	id; // Dep 对象标识
    constructor() {
      /**************改动**************************/
        this.id = uid++;
      /****************************************/
        this.subs = []; // 保存所有需要执行的函数
    }

    addSub(sub) {
        this.subs.push(sub);
    }
    depend() {
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

在 `Watcher` 中，我们引入 `this.depIds` 来记录所有的 `id` 。

```js
import Dep from "./dep";
export default class Watcher {
  constructor(Fn) {
    this.getter = Fn;
    /*************改动***************************/
    this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
    /****************************************/
    this.get();
  }

  /**
     * Evaluate the getter, and re-collect dependencies.
     */
  get() {
    Dep.target = this; // 保存包装了当前正在执行的函数的 Watcher
    let value;
    try {
      value = this.getter.call();
    } catch (e) {
      throw e;
    } finally {
      this.cleanupDeps();
    }
    return value;
  }

  /**
     * Add a dependency to this directive.
     */
  addDep(dep) {
    /*************改动***************************/
    const id = dep.id;
    if (!this.depIds.has(id)) {
      dep.addSub(this);
    }
    /****************************************/

  }

  /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
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

# 重置

同样是两个方案：

1. 全量式移除，保存 `Watcher` 所影响的所有 `Dep` 对象，当重新收集 `Watcher` 的前，把当前 `Watcher` 从记录中的所有 `Dep` 对象中移除。
2. 增量式移除，重新收集依赖时，用一个新的变量记录所有的 `Dep` 对象，之后再和旧的 `Dep` 对象列表比对，如果新的中没有，旧的中有，就将当前 `Watcher` 从该 `Dep` 对象中移除。

`Vue2` 中采用的是方案 `2`，这里也实现下。

首先是 `Dep` 类，我们需要提供一个 `removeSub` 方法。

```js
import { remove } from "./util";
/*
export function remove(arr, item) {
    if (arr.length) {
        const index = arr.indexOf(item);
        if (index > -1) {
            return arr.splice(index, 1);
        }
    }
}
*/
let uid = 0;

export default class Dep {
    static target; //当前在执行的函数
    subs; // 依赖的函数
    id; // Dep 对象标识
    constructor() {
        this.id = uid++;
        this.subs = []; // 保存所有需要执行的函数
    }
		
    addSub(sub) {
        this.subs.push(sub);
    }
  /*************新增************************/
    removeSub(sub) {
        remove(this.subs, sub);
    }
  /****************************************/
    depend() {
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

然后是 `Watcher` 类，我们引入 `this.deps` 来保存所有的旧 `Dep` 对象，引入 `this.newDeps` 来保存所有的新 `Dep` 对象。

```js
import Dep from "./dep";
export default class Watcher {
    constructor(Fn) {
        this.getter = Fn;
        this.depIds = new Set(); // 拥有 has 函数可以判断是否存在某个 id
      	/*************新增************************/
        this.deps = [];
        this.newDeps = []; // 记录新一次的依赖
        this.newDepIds = new Set();
      	/****************************************/
        this.get();
    }

    /**
     * Evaluate the getter, and re-collect dependencies.
     */
    get() {
        Dep.target = this; // 保存包装了当前正在执行的函数的 Watcher
        let value;
        try {
            value = this.getter.call();
        } catch (e) {
            throw e;
        } finally {
          	/*************新增************************/
            this.cleanupDeps();
          	/****************************************/
        }
        return value;
    }

    /**
     * Add a dependency to this directive.
     */
    addDep(dep) {
        const id = dep.id;
      /*************新增************************/
        // 新的依赖已经存在的话，同样不需要继续保存
        if (!this.newDepIds.has(id)) {
            this.newDepIds.add(id);
            this.newDeps.push(dep);
            if (!this.depIds.has(id)) {
                dep.addSub(this);
            }
        }
      /****************************************/
    }

    /**
     * Clean up for dependency collection.
     */
  	/*************新增************************/
    cleanupDeps() {
        let i = this.deps.length;
        // 比对新旧列表，找到旧列表里有，但新列表里没有，来移除相应 Watcher
        while (i--) {
            const dep = this.deps[i];
            if (!this.newDepIds.has(dep.id)) {
                dep.removeSub(this);
            }
        }

        // 新的列表赋值给旧的，新的列表清空
        let tmp = this.depIds;
        this.depIds = this.newDepIds;
        this.newDepIds = tmp;
        this.newDepIds.clear();
        tmp = this.deps;
        this.deps = this.newDeps;
        this.newDeps = tmp;
        this.newDeps.length = 0;
    }
  	/****************************************/
    /**
     * Subscriber interface.
     * Will be called when a dependency changes.
     */
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

# 测试

回到开头的代码

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    ok: true,
};
observe(data);

const updateComponent = () => {
    console.log("收到", data.ok ? data.text : "not");
};

new Watcher(updateComponent); // updateComponent 执行一次函数，输出 hello, world

data.ok = false; // updateComponent 执行一次函数，输出 not

data.text = "hello, liang"; // updateComponent 会执行吗？

```

此时 `data.text` 修改的话就不会再执行 `updateComponent` 了，因为第二次执行的时候，我们把 `data.text` 中 `Dep` 里的 `Watcher` 清除了。

# 总

今天这个主要就是对响应式系统的一点优化，避免不必要的重新执行。所做的事情就是重新调用函数的时候，把已经没有关联的 `Watcher` 去除。

![image-20220331091857522](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331091857522.png)

不知道看到这里大家有没有一个疑问，我是一直没想到说服我的点，欢迎一起交流：

在解决去重问题上，我们是引入了 `id` ，但如果直接用 `set` 其实就可以。在  `Watcher` 类中是用 `Set` 来存 `id` ，用数组来存 `Dep` 对象，为什么不直接用 `Set` 来存 `Dep` 对象呢？
