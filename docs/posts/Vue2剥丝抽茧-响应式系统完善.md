---
title: Vue2剥丝抽茧-响应式系统完善
categories: 前端
tags:
  - vue2
date: 2022-04-03 11:56:32
---

接 [Vue2剥丝抽茧-响应式系统](https://windliang.wang/2022/03/27/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F/)、[Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/)，[Vue2剥丝抽茧-响应式系统之嵌套](https://windliang.wang/2022/04/02/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%B5%8C%E5%A5%97/) 还没有看过的同学需要看一下。

这篇文章主要修之前代码存在的一个问题，废话不多说，上代码！

# 场景

```js
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
};
observe(data);
let show = true;
const updateComponent = () => {
    if (show) {
        console.log(data.text);
        show = false;
    }
};

new Watcher(updateComponent);

new Watcher(() => console.log("依赖", data.text));

data.text = "123";
```

先可以 `1` 分钟思考一下会输出什么。

* `new Watcher(updateParentComponent);` 

  执行 `updateParentComponent` 函数，输出 `hello, world`，并且 `text` 的  `Dep`    收集该 `Watcher` 。

  ![image-20220403121307975](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220403121307975.png)

* `new Watcher(() => console.log("依赖", data.text));`

  执行匿名函数，输出 `依赖 hello, world` ，并且 `text` 的  `Dep` 收集该 `Watcher` 。

  ![image-20220403121807211](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220403121807211.png)

* `data.text = "123";` 。

  触发 `text` 的 `set`，依次执行 `Dep` 中的 `Watcher` 。

  先执行 `updateParentComponent` 。

  ```js
  const updateComponent = () => {
      if (show) {
          console.log(data.text);
          show = false;
      }
  };
  ```

  由于之前已经执行过一次了，此时 `show` 就是 `false` 了，什么都不会输出。

  再执行 `() => console.log("依赖", data.text)` ，输出 `依赖 hello, world`。

是的，上边是我们所期望的样子，但事实上输出结果如下：

![image-20220403122245290](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220403122245290.png)

出错代码 `dep.js:37:26` 如下：

![image-20220403122317871](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220403122317871.png)

调用 `update` 的时候是，遍历过程中 `subs[i]` 变成了 `undefined` ，导致了报错。

需要回忆下 [Vue2剥丝抽茧-响应式系统之分支切换](https://windliang.wang/2022/03/31/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2/) 这篇文章里我们做了什么。

![image-20220331091857522](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220331091857522.png)

如果 `Watcher` 中的函数不再依赖当前属性，我们就把当前 `Watcher` 从该属性的 `Dep` 中移除。

而移除其实就是调用了数组的 `splice` 方法，直接将 `Dep` 中的 `subs` 数组元素进行删除。

```js
removeSub(sub) {
  remove(this.subs, sub);
}

export function remove(arr, item) {
  if (arr.length) {
    const index = arr.indexOf(item);
    if (index > -1) {
      return arr.splice(index, 1);
    }
  }
}
```

而此时我们正在遍历 `subs` 数组：

```js
notify() {
  for (let i = 0, l = this.subs.length; i < l; i++) {
    this.subs[i].update();
  }
}
```

对应上边的例子，原本 `subs` 数组两个 `Watcher`，第一个 `Watcher` 执行的时候没有访问 `data.text` 属性，就要把这一个 `Watcher` 删除了，第二个就移动到第一个的位置了，此时 `for` 循环中访问第二个位置的 `Watcher` 因为被移到前边自然就报错了。

修改起来也很容易，我们只需要在循环前，将原有的 `subs` 数组保存给一个新的数组即可。

```js
notify() {
  // stabilize the subscriber list first
  const subs = this.subs.slice();
  for (let i = 0, l = subs.length; i < l; i++) {
    subs[i].update();
  }
}
```

# 总

这篇文章比较简单，主要就是循环通知 `Watcher` 之前把列表另存起来，防止遍历过程中被修改。
