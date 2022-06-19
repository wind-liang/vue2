---
title: Vue2剥丝抽茧-虚拟 dom 之移动优化
categories: 前端
tags:
    - vue2
date: 2022-06-15 08:38:33
---

[虚拟 dom 之移动](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8.html) 中我们介绍了一个简单的虚拟 `dom diff` 的算法，这篇文章主要介绍一下对它的优化。

## 场景

考虑下边的场景：

![image-20220616080325434](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616080325434.png)

按照 [虚拟 dom 之移动](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8.html) 中的算法，遍历 `newVnode` ，`a` 对应的 `index = 0` 小于 `4` ，所以要把 `dom` 中对应的 `a` 移到 `e` 后边，同理依次把 `b` 再移到 `a` 后边，`c` 移到 `b` 后边，`d` 移到 `c` 后边，最终将 `oldVnode` 对应的 `dom` 结构转换为了 `newVnode` 对应的 `dom` 结构。

部分过程如下：

![image-20220616080635544](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616080635544.png)

![image-20220616080738094](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616080738094.png)

总共需要 `4` 次的 `dom` 移动，但如果我们仔细观察 `oldVnode` 到 `newVnode` 的变化：

![image-20220616080325434](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616080325434.png)

我们只需要将 `e` 移动到 `a` 的前边，移动 `1` 次就把 `oldVnode` 对应的 `dom` 结构转换为了 `newVnode` 对应的 `dom` 结构。

下边我们就针对上边这类情况进行算法的优化。

## 双端 diff 算法

对于上边的场景，我们可以将新的 `vnode` 和旧 `vnode` 的头部和尾部比较即可找到匹配的 `e` 。

![image-20220616093047255](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616093047255.png)

找到 `e` 之后，因为当前 `e` 是新的 `vnode` 头部、旧 `vnode` 的尾部，我们需要把 `e` 对应的 `dom` 移动到 `oldStartIdx` 对应的 `a` 的 `dom` 的前边。

![image-20220616093604867](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616093604867.png)

移动一次，`dom` 的顺序就和 `newVnode` 一致了。

除了头尾进行了交换，尾头也可能发生交换，下边我们讨论头头比较、尾尾比较、头尾比较、尾头比较不同情况的处理方式即可。

![image-20220616082219954](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220616082219954.png)

### 头头比较

如果 `newStartIdx` 和 `oldStartIdx` 对应的 `vnode` 相同：

![image-20220617094104641](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220617094104641.png)

`dom` 顺序无需改变，此时只需要将 `oldStartIdx` 和 `newStartIdx` 都后移即可：

![image-20220617094535252](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220617094535252.png)

如果不相同，我们就进行尾尾比较。

### 尾尾比较

如果 `newEndIdx` 和 `oldEndIdx` 对应的 `vnode` 相同：

![image-20220619134415466](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619134415466.png)

`dom` 顺序无需改变，此时只需要将 `newEndIdx` 和 `oldEndIdx` 都前移即可：

![image-20220619134927184](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619134927184.png)

如果不相同，我们就进行头尾比较。

### 头尾比较

如果 `oldStartIdx` 和 `newEndIdx` 对应的 `vnode` 相同：

![image-20220619135411563](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619135411563.png)

此时 `e` 对应的 `dom` 节点从第一个位置移动到了最后一个，`oldVnode` 的顺序对应的就是实际 `dom` 的顺序，我们需要将 `e` 对应的 `dom` 接到 `oldEndIdx` 对应 `dom` 的后边。

然后将 `oldStartIdx` 后移，`newEndIdx` 前移。

![image-20220619140020917](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619140020917.png)

如果不相同，我们就进行尾头比较。

### 尾头比较

如果 `oldEndIdx` 和 `newStartIdx` 对应的 `vnode` 相同：

![image-20220619140157014](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619140157014.png)

此时说明 `e` 对应的 `dom` 节点从最后一个位置移动到了第一个，`oldVnode` 的顺序对应的就是实际 `dom` 的顺序，我们需要将 `e` 对应的 `dom` 移动到 `oldStartIdx` 对应 `dom` 的前边。

然后将 `newStartIdx` 后移，`oldEndIdx` 前移。

![image-20220619144639378](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220619144639378.png)

### 小结

因为我们假设了没有增删节点，所以上边的四种情况就已经完备了，接下来只需要不停的重复上边的比较过程，当 `oldStartIdx` 和 `oldEndIdx` 相遇即说明所有节点判断完毕了。

## 代码实现

只需要按照上边的逻辑编写即可，调用 `nodeOps.insertBefore` 来实现移动 `dom` 。

```js
function updateChildren(parentElm, oldCh, newCh) {
  let oldStartIdx = 0;
  let newStartIdx = 0;
  let oldEndIdx = oldCh.length - 1;
  let oldStartVnode = oldCh[0];
  let oldEndVnode = oldCh[oldEndIdx];
  let newEndIdx = newCh.length - 1;
  let newStartVnode = newCh[0];
  let newEndVnode = newCh[newEndIdx];

  while (oldStartIdx <= oldEndIdx) {
    // 头头比较
    if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode);
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    // 尾尾比较
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    // 头尾比较
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // Vnode moved right
      patchVnode(oldStartVnode, newEndVnode);
      nodeOps.insertBefore(
        parentElm,
        oldStartVnode.elm,
        nodeOps.nextSibling(oldEndVnode.elm)
      );
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    // 尾头比较
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // Vnode moved left
      patchVnode(oldEndVnode, newStartVnode);
      nodeOps.insertBefore(
        parentElm,
        oldEndVnode.elm,
        oldStartVnode.elm
      );
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    }
  }
}
```

## 测试

测试程序不需要变化，还是[虚拟 dom 之移动](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8.html) 中的测试代码：

```js
import * as nodeOps from "./node-ops";
import modules from "./modules";
import { createPatchFunction } from "./patch";
import { createElement } from "./create-element";
import { observe } from "./observer/reactive";
import Watcher from "./observer/watcher";
const options = {
    el: "#root",
    data: {
        list: ["a", "b", "c"],
    },
    render(createElement) {
        const children = [];
        for (const item of this.list) {
            children.push(createElement("div", { key: item }, item));
        }
        const vnode = createElement(
            "div",
            {
                on: {
                    click: () => {
                        console.log(1);
                        this.list = ["c", "a", "b"];
                    },
                },
            },
            children
        );
        return vnode;
    },
};

const _render = function () {
    const vnode = options.render.call(options.data, createElement);
    return vnode;
};

const __patch__ = createPatchFunction({ nodeOps, modules });

const vm = {};
vm.$el = document.querySelector(options.el);
const _update = (vnode) => {
    const prevVnode = vm._vnode;
    vm._vnode = vnode;
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
        // initial render
        vm.$el = __patch__(vm.$el, vnode);
    } else {
        // updates
        vm.$el = __patch__(prevVnode, vnode);
    }
};

observe(options.data);

new Watcher(options.data, () => _update(_render()));
```

通过优化，由 `a,b,c` 变为 `c,a,b` ，只需要移动一次 `dom` ，将 `c` 移动到 `a` 前边即可。

## 总

这篇文章主要是针对一些特定情况进行了优化，根本目的就是减少 `dom` 的移动，相比于 [虚拟 dom 之移动](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8.html) ，我们也只是更新了 `updateChildren` 方法。

当然，目前为止我们还是假设前后 `dom` 结构没有发生变化，下篇文章我们会考虑 `dom` 增减场景下的处理。

文本对应源码详见：[vue.windliang.wang](https://vue.windliang.wang/)

