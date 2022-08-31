---
title: Vue2剥丝抽茧-模版编译之生成AST
categories: 前端
tags:
    - vue2
date: 2022-08-29 07:34:33
---

上篇文章 [模版编译之分词](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E5%88%86%E8%AF%8D.html) 中当解析出开始标签、结束标签或者文本的时候都会调用相应的回调函数，这篇文章就来实现回调函数，生成 `AST` 。

## AST 结构

`AST` 即抽象语法树，在 [虚拟dom](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E8%99%9A%E6%8B%9Fdom%E7%AE%80%E4%BB%8B.html#%E8%99%9A%E6%8B%9F-dom-%E5%AE%9A%E4%B9%89)、[eslint](https://windliang.wang/2021/09/02/eslint-v0-0-2%E5%81%9A%E4%BA%86%E4%BB%80%E4%B9%88/)、[babel](https://windliang.wang/2021/09/26/babel-v1-7-8%E5%81%9A%E4%BA%86%E4%BB%80%E4%B9%88/) 都有接触过了，简单来说就是一种描述 `dom` 的数据结构。通过 `AST` 可以还原 `dom` ，也可以把 `dom` 转为 `AST` 。

因为是树的结构，所以肯定有一个 `children` 字段来保存子节点，同时有 `parent` 来保存父节点。其他的话还有 `tag` 名，节点类型，`type = 1` 代表普通节点类型，`type=3` 表示普通文本类型，`type=2` 代表有插值的的文本类型。

提供一个函数 `createASTElement` 来生成 `dom` 节点，后续会用到。

```js
export function createASTElement(tag, parent) {
    return {
        type: 1,
        tag,
        parent,
        children: [],
    };
}
```

## 栈

因为 `dom` 是一对一对出现的，一对中可能又包含多对，因此和括号匹配一样，这里就缺少不了栈了。

遇到开始标签就入栈，遇到结束标签就出栈，这样就可以保证栈顶元素始终是后续节点的父节点。

举个例子，对于 `<div><span>3<5吗</span><span>?</span></div>` 。

```js
1、
div span 3<5吗 /span span ? /span /div
 ^
stack:[div]，当前栈顶 div，后续节点为 div 的子节点

2、
div span 3<5吗 /span span ? /span /div
     ^
stack:[div, span]，当前栈顶 span，后续节点为 span 的子节点

3、
div span 3<5吗 /span span ? /span /div
          ^
stack:[div, span]，当前栈顶 span，3<5吗 属于 span

4、
div span 3<5吗 /span span ? /span /div
                ^
stack:[div]，遇到结束节点 span，栈顶的 span 去掉，后续节点为 div 的子节点

5、
div span 3<5吗 /span span ? /span /div
                      ^
stack:[div, span]，当前栈顶 span，后续节点为 span 的子节点

6、
div span 3<5吗 /span span ? /span /div
                          ^
stack:[div, span]，当前栈顶 span，? 属于 span

7、
div span 3<5吗 /span span ? /span /div
                              ^
stack:[div]，遇到结束节点 span，栈顶的 span 去掉，后续节点为 div 的子节点

8、
div span 3<5吗 /span span ? /span /div
                                   ^
stack:[]，遇到结束节点 div，栈顶的 div 去掉，遍历结束
```

## 整体算法

添加 `stack` 变量、添加 `currentParent` 保存当前的父节点、添加 `root` 保存根节点。

```js
let root;
let currentParent;
let stack = [];
```

接下来完善 [模版编译之分词](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E5%88%86%E8%AF%8D.html) 中遗留的 `start` 、`end`、`chars` 三个回调函数。

```js
parseHTML(template, {
    start: (tagName, unary, start, end) => {
        console.log("开始标签：", tagName, unary, start, end);
    },
    end: (tagName, start, end) => {
        console.log("结束标签：", tagName, start, end);
    },
    chars: (text, start, end) => {
        console.log("文本：", text, start, end);
    },
});
```

### `start` 函数

```js
start: (tagName, unary, start, end) => {
  let element = createASTElement(tagName, currentParent);
  if (!root) {
    root = element;
  }

  if (!unary) {
    currentParent = element;
    stack.push(element);
  } else {
    closeElement(element);
  }
},
```

先调用 `createASTElement` 生成一个 `AST` 节点，如果当前是第一个开始节点，就将 `root` 赋值，接下来判断是否是出一元节点。

如果是一元节点直接调用 `closeElement` ，将当前节点加入到父节点中。

```js
function closeElement(element) {
  if (currentParent) {
    currentParent.children.push(element);
    element.parent = currentParent;
  }
}
```

### end 函数

```js
end: (tagName, start, end) => {
  const element = stack[stack.length - 1];
  // pop stack
  stack.length -= 1;
  currentParent = stack[stack.length - 1];
  closeElement(element);
},
```

出栈，更新当前父节点，并且将出栈的元素加入到父节点中。

### chars 函数

```js
chars: (text, start, end) => {
  if (!currentParent) {
    return;
  }
  const children = currentParent.children;
  if (text) {
    let child = {
      type: 3,
      text,
    };
    children.push(child);
  }
},
```

这里只考虑了 `type` 为 `3` 的普通文本节点。

## 整体代码

结合 [模版编译之分词](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E6%A8%A1%E7%89%88%E7%BC%96%E8%AF%91%E4%B9%8B%E5%88%86%E8%AF%8D.html) 中实现的分词，整体代码如下：

```js
const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
export function createASTElement(tag, parent) {
    return {
        type: 1,
        tag,
        parent,
        children: [],
    };
}
export function parseHTML(html, options) {
    let index = 0;
    while (html) {
        let textEnd = html.indexOf("<");
        if (textEnd === 0) {
            // Start tag:
            const startTagMatch = parseStartTag();
            if (startTagMatch) {
                handleStartTag(startTagMatch);
                continue;
            }
            // End tag:
            var endTagMatch = html.match(endTag);
            if (endTagMatch) {
                var curIndex = index;
                advance(endTagMatch[0].length);
                parseEndTag(endTagMatch[1], curIndex, index);
                continue;
            }
        }

        let text, rest, next;
        if (textEnd >= 0) {
            rest = html.slice(textEnd);
            while (!endTag.test(rest) && !startTagOpen.test(rest)) {
                // < in plain text, be forgiving and treat it as text
                next = rest.indexOf("<", 1);
                if (next < 0) break;
                textEnd += next;
                rest = html.slice(textEnd);
            }
            text = html.substring(0, textEnd);
        }

        if (textEnd < 0) {
            text = html;
        }

        if (text) {
            advance(text.length);
        }

        if (options.chars && text) {
            options.chars(text, index - text.length, index);
        }
    }

    function advance(n) {
        index += n;
        html = html.substring(n);
    }

    function parseStartTag() {
        const start = html.match(startTagOpen);
        if (start) {
            const match = {
                tagName: start[1],
                attrs: [],
                start: index,
            };
            advance(start[0].length);
            let end = html.match(startTagClose);
            if (end) {
                match.unarySlash = end[1];
                advance(end[0].length);
                match.end = index;
                return match;
            }
        }
    }

    function handleStartTag(match) {
        const tagName = match.tagName;
        const unarySlash = match.unarySlash;
        const unary = !!unarySlash;
        options.start(tagName, unary, match.start, match.end);
    }

    function parseEndTag(tagName, start, end) {
        options.end(tagName, start, end);
    }
}
const template = "<div><span>3<5吗</span><span>?</span></div>";
console.log(template);

function parse(template) {
    let root;
    let currentParent;
    let stack = [];
    function closeElement(element) {
        if (currentParent) {
            currentParent.children.push(element);
            element.parent = currentParent;
        }
    }
    parseHTML(template, {
        start: (tagName, unary, start, end) => {
            let element = createASTElement(tagName, currentParent);
            if (!root) {
                root = element;
            }

            if (!unary) {
                currentParent = element;
                stack.push(element);
            } else {
                closeElement(element);
            }
        },
        end: (tagName, start, end) => {
            const element = stack[stack.length - 1];
            // pop stack
            stack.length -= 1;
            currentParent = stack[stack.length - 1];
            closeElement(element);
        },
        chars: (text, start, end) => {
            if (!currentParent) {
                return;
            }
            const children = currentParent.children;
            if (text) {
                let child = {
                    type: 3,
                    text,
                };
                children.push(child);
            }
        },
    });
    return root;
}
const ast = parse(template);
console.log(ast);
```

输入 `<div><span>3<5吗</span><span>?</span></div>` 。

最终生成的 `AST` 结构如下：

![image-20220831074415588](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220831074415588.png)

## 总

这篇文章实现了最简单情况的 `AST` 生成，了解了整个的结构，下一篇文章会通过 `AST` 生成 `render` 函数。

文章对应源码详见 [vue.windliang.wang/](https://vue.windliang.wang/)。
