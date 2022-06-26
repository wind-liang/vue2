---
title: Vue2剥丝抽茧-虚拟 dom 之增删
categories: 前端
tags:
    - vue2
date: 2022-06-21 08:32:33
---

[虚拟 dom 之移动优化](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8%E4%BC%98%E5%8C%96.htm) 中介绍了虚拟 `dom` 的双端 `diff` 的算法，但是没有考虑当虚拟 `dom` 增加或者减少的情况，这篇文章介绍增删 `dom` 在各个场景下的的代码完善。

## 循环未找到

[虚拟 dom 之移动优化](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8%E4%BC%98%E5%8C%96.htm)  中我们进行了头头、尾尾、头尾、尾头的比较后如果没找到对应 `Vnode` ，就开始通过循环查找，但如果是下边的情况：

![image-20220621092725266](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220621092725266.png)

此时头头、尾尾、头尾、尾头都没有匹配到，所以开始遍历 `oldVnode` 寻找 `newStartIdx` 对应的 `e` 节点，此时 `oldVnode` 遍历完肯定也找不到 `e` 节点。

这种情况，我们就需要创建一个 `dom` ，然后插到 `oldStartIdx` 指向的 `a` 节点的前边。

```js
idxInOld = isDef(newStartVnode.key)
  ? oldKeyToIdx[newStartVnode.key]
: findIdxInOld(
  newStartVnode,
  oldCh,
  oldStartIdx,
  oldEndIdx
);
if (isUndef(idxInOld)) { // 没有找到对应的节点
  // New element
  createElm(newStartVnode, parentElm, oldStartVnode.elm);
} else {
  vnodeToMove = oldCh[idxInOld];
  if (sameVnode(vnodeToMove, newStartVnode)) {
    ...
  } else { // 找到了可能 key 相同，但是 tag 名发生了变化
    // same key but different element. treat as new element
    createElm(newStartVnode, parentElm, oldStartVnode.elm);
  }
  }
```

除了上边图中情况，代码中还补充了一种情况。

因为我们找 `oldVnode` 的时候是通过 `key` 得到的，所以还有可能找到了相同 `key` 的 `vnode`，但 `tag` 可能发生了变化，此时也需要创建节点进行插入。

## children 内增加节点

![image-20220623075630700](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623075630700.png)

对于上边的情况，头头匹配，然后指针后移：

![image-20220623075714925](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623075714925.png)

头头依旧匹配，继续后移：

![image-20220623075927568](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623075927568.png)

头头还是匹配，继续后移：

![image-20220623080015354](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623080015354.png)

此时 `oldStartIdx` 大于了 `oldEndIdx` 结束了 `while` 循环：

```js
while (oldStartIdx <= oldEndIdx) {
  ...
}
```

当前情况下 `newVnode` 就可能有新增节点，我们调用 `addNode` 来增加。

```js
if (oldStartIdx > oldEndIdx) {
  addVnodes(parentElm, null, newCh, newStartIdx, newEndIdx);
}
```

将 `newCh` 的 `newStartIdx` 到 `newEndIdx` 的节点加入到 `parentElm` 末尾即可。第二个参数表示插入到谁的前边，传 `null` 表示插入到末尾。

`addVnodes` 具体代码如下：

```js
function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    createElm(vnodes[startIdx], parentElm, refElm);
  }
}
function createElm(vnode, parentElm, refElm) {
  const data = vnode.data; // dom 相关的属性都放到 data 中
  const children = vnode.children;
  const tag = vnode.tag;
  if (isDef(tag)) {
    vnode.elm = nodeOps.createElement(tag);
    createChildren(vnode, children);
    if (isDef(data)) {
      invokeCreateHooks(vnode);
    }
    insert(parentElm, vnode.elm, refElm);
  } else {
    vnode.elm = nodeOps.createTextNode(vnode.text);
    insert(parentElm, vnode.elm, refElm);
  }
}
function insert(parent, elm, ref) {
  if (isDef(parent)) {
    if (isDef(ref)) {
      if (nodeOps.parentNode(ref) === parent) {
        nodeOps.insertBefore(parent, elm, ref);
      }
    } else {
      nodeOps.appendChild(parent, elm);
    }
  }
}
```

上边是在尾部新增了节点，当然还可能在头部增加了节点，如下所示：

![image-20220623082413743](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623082413743.png)

上边就会一直尾尾匹配，`c` 和 `c` 匹配，`b` 和 `b` 匹配，`a` 和 `a` 匹配，`end` 指针一直前移最终达到后边的状态：

![image-20220623082617006](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623082617006.png)

此时又出现了 `oldStartIdx` 大于 `oldEndIdx` 的情况，因此会终结 `while` 循环：

```js
while (oldStartIdx <= oldEndIdx) {
  ...
}
```

同样，我们需要将新增节点 `d、e` 插入，需要插入到 `a` 的前边，因此我们需要通过 `newEndIdx` 得到 `a` 节点作为参考节点传入。

```js
if (oldStartIdx > oldEndIdx) {
  refElm = newCh[newEndIdx + 1].elm;
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
} 
```

上边两种情况结合起来如下：

```js
if (oldStartIdx > oldEndIdx) {
  refElm = isUndef(newCh[newEndIdx + 1])
    ? null
  : newCh[newEndIdx + 1].elm;
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
} 
```

## children 内减少节点

![image-20220623083108933](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623083108933.png)

此时头头匹配，指针后移：

![image-20220623083207396](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623083207396.png)

头头匹配，指针继续后移：

![image-20220623083256258](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623083256258.png)

此时 `oldStartIdx` 和 `oldEndIdx` 相等， 因此 `while` 循环不会结束。但 `newStartIdx` 已经大于了 `newEndIdx` ，代表 `newVnode` 已经遍历结束，此时应该结束循环了。

所以 `while` 循环加一个条件：

```js
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
...
}
```

我们判断如果 `newStartIdx` 大于 `newEndIdx` 了，就去遍历 `oldVnode` 来删除节点。

```js
if (oldStartIdx > oldEndIdx) {
  refElm = isUndef(newCh[newEndIdx + 1])
    ? null
  : newCh[newEndIdx + 1].elm;
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
} else if (newStartIdx > newEndIdx) { // 尝试删除节点
  removeVnodes(oldCh, oldStartIdx, oldEndIdx);
}

function removeVnodes(vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx];
    if (isDef(ch)) {
      if (isDef(ch.tag)) {
        removeAndInvokeRemoveHook(ch);
      } else {
        // Text node
        removeNode(ch.elm);
      }
    }
  }
}
function removeAndInvokeRemoveHook(vnode, rm) {
  removeNode(vnode.elm);
}

function removeNode(el) {
  const parent = nodeOps.parentNode(el);
  // element may have already been removed due to v-html / v-text
  if (isDef(parent)) {
    nodeOps.removeChild(parent, el);
  }
}
```

上边仅仅是简单的删除 `dom` ，第一篇 [虚拟dom](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E7%AE%80%E4%BB%8B.html#%E6%95%B4%E4%BD%93%E6%B5%81%E7%A8%8B) 我们已经介绍过 `removeVnodes` 了，`Vue` 源码中 `removeAndInvokeRemoveHook` 方法还会调用相应的 `hook`，这里就省略了。

## 增加整个 children

除了 `children` 中的节点有增减，还可能增加了整个 `children` ，如下图：

![image-20220623093336337](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220623093336337.png)

如果旧 `vnode` 中的 `children` 不存在，新的 `children` 存在，我们调用 `addVnode` 添加节点即可。

```js
function patchVnode(oldVnode, vnode) {
  if (oldVnode === vnode) {
    return;
  }

  ...
  if (isUndef(vnode.text)) { // 非 text 节点或者 text 节点为空字符串
    if (isDef(oldCh) && isDef(ch)) { // 新旧 children 都存在
      if (oldCh !== ch) updateChildren(elm, oldCh, ch); // 进行 diff 算法
    } else if (isDef(ch)) { // 新 children 存在，旧 children 不存在，本次新增情况
      addVnodes(elm, null, ch, 0, ch.length - 1); // 添加新 children
    }
  }
}
```

测试程序构造如下：

```js
data: {
  list: null,
},
  render(createElement) {
    const vnode = createElement(
      "div",
      {
        on: {
          click: () => {
            console.log(1);
            this.list = ["a", "b"];
          },
        },
      },
      [
        createElement(
          "div",
          {
            key: "1",
          },
          this.list
        ),
        "123",
      ]
    );
    return vnode;
  },
```

一开始 `list` 为 `null`，点击后变为两个 `text` 节点 `ab` 。

## 减少整个 children

![image-20220624081237903](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220624081237903.png)

如上图所示，`div` 的 `children` 被整个移除。

对于这种情况我们直接调用删除节点方法即可。

```js
if (isUndef(vnode.text)) {
  if (isDef(oldCh) && isDef(ch)) {
    if (oldCh !== ch) updateChildren(elm, oldCh, ch);
  } else if (isDef(ch)) {
    // if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "");
    addVnodes(elm, null, ch, 0, ch.length - 1);
  } else if (isDef(oldCh)) { // old Children 存在，new Children 不存在
    removeVnodes(oldCh, 0, oldCh.length - 1);
  }
}
```

对应的测试程序如下：

```js
data: {
  list: ["a", "b"],
},
  render(createElement) {
    const vnode = createElement(
      "div",
      {
        on: {
          click: () => {
            console.log(1);
            this.list = null;
          },
        },
      },
      [
        createElement(
          "div",
          {
            key: "1",
          },
          this.list
        ),
        "123",
      ]
    );
    return vnode;
  },
```

## 完整代码

`patchVnode`  判断新旧两个 `node` 的情况：

```js
function patchVnode(oldVnode, vnode) {
  if (oldVnode === vnode) {
    return;
  }

  const elm = (vnode.elm = oldVnode.elm);
  const oldCh = oldVnode.children;
  const ch = vnode.children;
  const data = vnode.data;
  if (isDef(data) && isPatchable(vnode)) {
    for (i = 0; i < cbs.update.length; ++i)
      cbs.update[i](oldVnode, vnode);
  }
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch); // 进行 diff 更新
    } else if (isDef(ch)) {
      addVnodes(elm, null, ch, 0, ch.length - 1); // 增加整个 children
    } else if (isDef(oldCh)) {
      removeVnodes(oldCh, 0, oldCh.length - 1); // 减少整个 children
    }
  } else if (oldVnode.text !== vnode.text) { // 前后都是 text 节点，更新 text
    nodeOps.setTextContent(elm, vnode.text);
  }
}
```

`updateChildren` ，也就是核心 `diff` 算法：

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
  let oldKeyToIdx, idxInOld, vnodeToMove, refElm;
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    if (isUndef(oldStartVnode)) {
      oldStartVnode = oldCh[++oldStartIdx]; // 已经被置为 undefined 跳过
    } else if (isUndef(oldEndVnode)) {
      // 已经被置为 undefined 跳过
      oldEndVnode = oldCh[--oldEndIdx];
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode);
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
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
    } else {
      if (isUndef(oldKeyToIdx))
        oldKeyToIdx = createKeyToOldIdx(
          oldCh,
          oldStartIdx,
          oldEndIdx
        );
      idxInOld = isDef(newStartVnode.key)
        ? oldKeyToIdx[newStartVnode.key]
      : findIdxInOld(
        newStartVnode,
        oldCh,
        oldStartIdx,
        oldEndIdx
      );
      if (isUndef(idxInOld)) {
        // New element
        createElm(newStartVnode, parentElm, oldStartVnode.elm);
      } else {
        vnodeToMove = oldCh[idxInOld];
        if (sameVnode(vnodeToMove, newStartVnode)) {
          patchVnode(vnodeToMove, newStartVnode);
          oldCh[idxInOld] = undefined;
          nodeOps.insertBefore(
            parentElm,
            vnodeToMove.elm,
            oldStartVnode.elm
          );
        } else {
          // same key but different element. treat as new element
          createElm(newStartVnode, parentElm, oldStartVnode.elm);
        }
      }

      newStartVnode = newCh[++newStartIdx];
    }
  }
  // children 内增删节点
  if (oldStartIdx > oldEndIdx) {
    refElm = isUndef(newCh[newEndIdx + 1])
      ? null
    : newCh[newEndIdx + 1].elm;
    addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
  } else if (newStartIdx > newEndIdx) {
    removeVnodes(oldCh, oldStartIdx, oldEndIdx);
  }
}
```

## 总

结合前边的 [虚拟dom之移动](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8.html)、[虚拟dom之移动优化](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E4%B9%8B%E7%A7%BB%E5%8A%A8%E4%BC%98%E5%8C%96.html#%E5%9C%BA%E6%99%AF) 就是 `Vue2` 中核心的 `虚拟 dom diff` 算法了。核心思想就是为了提高 `dom` 的复用、减少 `dom` 的操作，在 `Vue3` 中 `diff` 算法再次进行了优化，感兴趣的同学可以去了解一下。

## 讨论

`patchVnode` 有两种情况没有介绍到：

```js
function patchVnode(oldVnode, vnode) {
  if (oldVnode === vnode) {
    return;
  }

  const elm = (vnode.elm = oldVnode.elm);
  const oldCh = oldVnode.children;
  const ch = vnode.children;
  const data = vnode.data;
  if (isDef(data) && isPatchable(vnode)) {
    for (i = 0; i < cbs.update.length; ++i)
      cbs.update[i](oldVnode, vnode);
  }
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch);
    } else if (isDef(ch)) {
      /*****************************************************************/
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, ""); // 源码中有但没有想到对应的例子
      /*****************************************************************/
      addVnodes(elm, null, ch, 0, ch.length - 1);
    } else if (isDef(oldCh)) {
      removeVnodes(oldCh, 0, oldCh.length - 1);
    /*****************************************************************/
    } else if (isDef(oldVnode.text)) { // 源码中有但没有想到对应的例子
      nodeOps.setTextContent(elm, "");
    }
    /*****************************************************************/
  } else if (oldVnode.text !== vnode.text) {
    nodeOps.setTextContent(elm, vnode.text);
  }
}
```

上边的两种情况，没有想到 `render` 函数返回什么样 `vnode` 可以走到上边的逻辑，想到例子的同学欢迎和我交流。

文本对应源码详见：[vue.windliang.wang](https://vue.windliang.wang/)

