---
title: Vue2剥丝抽茧-模版编译之分词
categories: 前端
tags:
    - vue2
date: 2022-08-13 16:19:33
---

通过前边 [响应式系统](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-VueLiang0.html#%E4%BB%A3%E7%90%86) 和 [虚拟 dom](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-VueLiang1.html)，我们已经可以通过 `render` 函数

```js
render(createElement) {
  return createElement("div", [
    'hello world',
  ]);
},
```

渲染为真实的 `dom` 。

模版编译的作用就是将字符串模版：

```html
<div>hello</div>
```

转为我们之前使用的 `render` 函数。

我们需要做的是词法分析，将标签、属性、文本全部解析出来，然后生成 `AST` 树，最终通过 `AST` 树生成 `render` 函数。

这篇文章主要讲词法分析，并且将问题简化，只把开始标签、文本、结束标签的 `token` 解析出来。

## 词法分析之有限自动机

我们期望的输入、输出如下：

输入任意合法的 `html` 文本：`<div>hello</div>`。

输出解析出来的各个 `token`：

```js
div
hello
div
```

其实这和 `Vue` 已经没有关系了，更像一道算法题，主要涉及到编译器分词的知识。

整体代码就是一个 `while` 循环，依次判断每次输入的字符：

```js
const template = '<div>hello</div>;
while(template) {
  const char = template[0];
  if(char === '<') {
    ...
    continue;
  }
  if(char === '>') {
    ...
    continue;
  }
  if(/^[A-Za-z]$/.test(char)) {
    ...
    continue;
  }
}
```

为了让代码逻辑更清晰，我们可以画一个有限状态自动机：

![image-20220809082714711](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220809082714711.png)

我们关心三种结束状态，开始 `tag` ，结束 `tag` 和文本标签，输入不同的字符进行状态转移。

对应于代码，我们定义一个全局的状态，然后判断输入的字符结合上边的图进行状态转移和输出 `tag` 名即可。

```js
const template = "<div><span>hello></span><span>world></span></div>"; // 复杂些，更好的看结果
console.log(template);
parseHTML(template, {
    start: (tagName) => {
        console.log("开始标签：", tagName);
    },
    end: (tagName) => {
        console.log("结束标签", tagName);
    },
    chars: (text) => {
        console.log("文本", text);
    },
});
function advance(html) {
    return html.substring(1);
}
function parseHTML(template, options) {
    const STATE_ENUM = {
        START: 0,
        TAG_START: 1,
        END_TAG_START: 2,
        START_TAG_NAME: 3,
        END_TAG_NAME: 4,
        TEXT_TAG: 5,
    };
    let CURRENT_STATE = STATE_ENUM.START;
    let tagName = "";
    while (template) {
        const char = template[0];
        switch (CURRENT_STATE) {
            case STATE_ENUM.START:
                if (char === "<") {
                    CURRENT_STATE = STATE_ENUM.TAG_START;
                }
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.TEXT_TAG;
                }
                template = advance(template);
                break;
            case STATE_ENUM.TAG_START:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.START_TAG_NAME;
                }
                if (char === "/") {
                    CURRENT_STATE = STATE_ENUM.END_TAG_START;
                }
                template = advance(template);
                break;
            case STATE_ENUM.END_TAG_START:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.END_TAG_NAME;
                }
                template = advance(template);
                break;
            case STATE_ENUM.START_TAG_NAME:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === ">") {
                    CURRENT_STATE = STATE_ENUM.START;
                    options.start(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            case STATE_ENUM.END_TAG_NAME:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === ">") {
                    CURRENT_STATE = STATE_ENUM.START;
                    options.end(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            case STATE_ENUM.TEXT_TAG:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === "<") {
                    CURRENT_STATE = STATE_ENUM.TAG_START;
                    options.chars(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            default:
                throw new Error("未知情况");
        }
    }
}
```

看一下输出结果：

![image-20220810072640904](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220810072640904.png)

## 词法分析之正则

上边是一个一个字符的进行判断，`Vue` 中结合了正则表达式，可以加快遍历的速度。

### 正则

首先看一些提前定义好的正则：

1. 合法字符：

   ```js
   export const unicodeRegExp =
       /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
   ```

   定义了一些允许的 `unicode` 字符，关于 `unicode` 是什么可以参考 [追本溯源：字符串及编码](https://zhuanlan.zhihu.com/p/73917931)。

2. 合法 `tag` 名，[ncname ](https://docs.microsoft.com/zh-cn/previous-versions/ms256452(v=vs.120)?redirectedfrom=MSDN) 表示不包含冒号的 `xml` 名：

   ```js
   const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`; 
   ```

    以字母或者下划线开头，后边可以跟 `-`、数字、`_` 和任意字符。

3. 标签名捕获：

   ```js
   const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
   ```

   匹配 `abc:div` 这样的名字，`abc:` 是可选的，并且整个名字用括号括起来作为正则的一个捕获组。

   里边的括号 `(?:${ncname}\\:)` 只是作为整体，`?:` 表示非捕获组。

4. 开始标签正则：

   ```js
   const startTagOpen = new RegExp(`^<${qnameCapture}`);
   ```

   `<` 开头，后边紧跟标签名作为捕获组。

5. 开始标签的结束正则：

   ```js
   const startTagClose = /^\s*(\/?)>/;
   ```

   任意个空白字符开头，`/>`  或者 `>` 结束，`/` 作为匹配组。
   
   可以匹配到 `<div>` 中的 `>` ，或者一元标签 `<br />` 的 `  />`。
   
5. 结束标签正则：

   ```js
   const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
   ```

   `</` 开头，中间是标签名的捕获组，任意个非 `>` 字符，最后 `>` 结尾。
   
   可以匹配 `</div>` 这样的标签。

### 整体流程

```js
const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

export function parseHTML(html, options) {
    let index = 0;
    while (html) {
        let textEnd = html.indexOf("<");
        if (textEnd === 0) {
            
        }
        let text, rest, next;
        if (textEnd >= 0) {
            
        }

        if (textEnd < 0) {
            text = html;
        }
    }

    function advance(n) {
        index += n;
        html = html.substring(n);
    }

    function parseStartTag() {
        ...
    }

    function handleStartTag(match) {
         ...
    }

    function parseEndTag(tagName, start, end) {
         ...
    }
}
const template = "<div><span>3<5吗</span><span>?</span></div>";
console.log(template);
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

整体上我们还是 `while` 循环来遍历 `html` ，然后在适当的位置调用 `options` 中相应的回调。在回调中，除了相应的 `tag` 名，我们把它的开始和结束下标也打印出来。

遍历 `html` 的过程中，我们不再是一个一个字符来消费，而是通过判断 `<` 的位置（保存在 `textEnd` 中），再结合正则，多个字符多个字符的移动。

此外还定义了 `advance` 函数用来消费 `n` 个字符，消费后直接覆盖 `html` 的值。

```js
function advance(n) {
  index += n;
  html = html.substring(n);
}
```

核心代码就是通过判断 `textEnd` 的位置驱动循环：

```js
while (html) {
  let textEnd = html.indexOf("<");
  if (textEnd === 0) {

  }
  let text, rest, next;
  if (textEnd >= 0) {

  }

  if (textEnd < 0) {
    text = html;
  }
}
```

### textEnd 等于 0

对于 `textEnd` 等于 `0` ，也就是 `<` 在 `html` 开头，当前 `html` 可能是下边的样子：

```html
<div>hello</div> // 遇到开始标签
</div> // 遇到结束标签
<=3</div> // < 是普通文本
```

下边我们依次对上边的三种情况进行分析。

### textEnd 等于 0 - 开始标签

我们来处理开始标签。

```js
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
        }
    }
}
```

先调用 `parseStartTag` 函数来解析开始标签：

```js
function parseStartTag() {
  const start = html.match(startTagOpen);
  if (start) {
    const match = {
      tagName: start[1],
      attrs: [],
      start: index,
    };
    advance(start[0].length);
  }
}
```

如果 `html` 是 `<div>hello</div>` ，那么上边的 `start` 就是

![image-20220812092048420](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220812092048420.png)

`start[0]` 是匹配到的字符，`start[1]` 是捕获的第一个分组，也就是 `tag` 名。

### textEnd 等于 0 - 开始标签的结束

开始标签匹配完了 `<div` ，我们还需要继续向后匹配 `>` 。

```js
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
```

如果 `html` 是 `>hello</div>` ，那么 `html.match(startTagClose)` 返回的 `end` 就是

![image-20220813084918354](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220813084918354.png)

`end[0]` 表示匹配到的字符 `>`，`end[1]` 是匹配到的分组，如果当前标签是普通标签那返回的就是空字符串，如果当前是自闭合标签，比如 `<br/>` 那么 `end[1]` 返回的就是 `/` 。

![image-20220813085522160](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220813085522160.png)

我们用 `unarySlash` 存储 `end[1]` ，表示是否是自闭合标签。

```js
if (end) {
  match.unarySlash = end[1];
  advance(end[0].length);
  match.end = index;
  return match;
}
```

接着调用 `advance` 来消费当前字符，并且将当前 `index` 保存到 `match.end` 中 。

外层调用中，如果 `parseStartTag` 返回了值，我们就通过 `handleStartTag` 进行回调。

```js
let textEnd = html.indexOf("<");
if (textEnd === 0) {
  // Start tag:
  const startTagMatch = parseStartTag();
  if (startTagMatch) {
    handleStartTag(startTagMatch);
    continue;
  }
}
```

`handleStartTag` 这里仅简单的调用回调。

```js
function handleStartTag(match) {
  const tagName = match.tagName;
  const unarySlash = match.unarySlash;
  const unary = !!unarySlash;
  options.start(tagName, unary, match.start, match.end);
}
```

### textEnd 等于 0 - 结束标签

开始标签和文本都解析完毕后，`html` 就只剩下了结束标签。

```js
 while (html) {
   let textEnd = html.indexOf("<");
   if (textEnd === 0) {
     // Start tag:
     const startTagMatch = parseStartTag();
     if (startTagMatch) {
       handleStartTag(startTagMatch);
       continue;
   
     
     // End tag:
     var endTagMatch = html.match(endTag);
     if (endTagMatch) {
       var curIndex = index;
       advance(endTagMatch[0].length);
       parseEndTag(endTagMatch[1], curIndex, index);
       continue;
     }
   }
 }
```

直接通过 `endTag` 的正则来进行匹配 `var endTagMatch = html.match(endTag);` 

![image-20220813091941723](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220813091941723.png)

如果当前 `html` 是 `</div>` ，得到的 `endTagMatch` 如下：

![image-20220813092312927](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220813092312927.png)

`endTagMatch[0]` 表示匹配到的字符，`endTagMatch[1]` 是匹配到的分组，表示标签名。

```js
var endTagMatch = html.match(endTag);
if (endTagMatch) {
  var curIndex = index;
  advance(endTagMatch[0].length);
  parseEndTag(endTagMatch[1], curIndex, index);
  continue;
}
```

如果 `endTagMatch` 有值，我们就调用 `advance` 消费相应的字符，接着调用 `parseEndTag` 进行其他的处理，这里仅简单的调用相应的回调。

```js
function parseEndTag(tagName, start, end) {
  options.end(tagName, start, end);
}
```

### textEnd 等于 0 - 文本标签

对于这种情况 `<=3</div>` ，`textEnd` 等于 `0` 。除此之外，对于文本标签，`<`  也可能出现在中间 `hello1<=3</div` 。

因此，我们把文本标签的处理都放到 `textEnd` 大于等于 `0` 中一起去处理。

### textEnd 大于等于 0 - 文本标签

文本标签会出现在一对 `tag` 标签之间。

```html
<div>1233<=5,2<=6</div>
     ^   ^    ^  ^
     s   i    j  e
```

文本标签就是 `s` 和 `e` 之间的文本，因为我们是通过 `<` 来定位，文本标签中可能出现多个 `<`，因此我们需要通过一个循环依次往后找 `<` ，最终找到 `e` 的位置。下边来梳理一下这个过程：

首先我们将 `textEnd` 到最后的文本取到，`rest = html.slice(textEnd);` 

```js
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
```

对于 `hello1<=3</div>` ，`rest` 就等于 `<=3</div>` ，接下来需要执行 `while` 循环，把结束标签 `</div>` 前的文本也取到。

除了结束标签，文本后边也可能跟一个开始标签，所以 `while` 循环的条件是 `!endTag.test(rest) && !startTagOpen.test(rest)` ，表示非结束标签和非开始标签。

看一下 `while` 内部的代码：

```js
while (!endTag.test(rest) && !startTagOpen.test(rest)) {
  // < in plain text, be forgiving and treat it as text
  next = rest.indexOf("<", 1);
  if (next < 0) break;
  textEnd += next;
  rest = html.slice(textEnd);
}
```

`rest.indexOf("<", 1)`，第二个参数传入 `1` 将第一个 `<` 跳过， 取到下一个 `<` 的位置，对于 `<=3</div>` 返回的 `next` 就等于 `3` 。

更新 `textEnd` 的位置，并且取到新的 `rest` ，`rest` 从 `<=3</div` 更新为 `</div>` ，因为当前 `rest` 就是结束标签了，所以就会走出 `while` 循环。

```js
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
```

出了 `while` 循环后，用 `text` 保存当前文本的值。

接下来判断如果 `text` 有值，我们就消费 `text` 的值，并且调用回调函数。

```js
if (text) {
  advance(text.length);
}

if (options.chars && text) {
  options.chars(text, index - text.length, index);
}
```

### textEnd 小于 0 - 文本标签

最后一种情况，即 `textEnd` 小于 `0` ，意味着没找到 `<` ，直接看做是文本标签。

```js
if (textEnd < 0) {
  text = html;
}

if (text) {
  advance(text.length);
}

if (options.chars && text) {
  options.chars(text, index - text.length, index);
}
```

### 整体代码

我们根据 `<` 的位置和正则，对 `html` 进行逐步解析，把上边的代码结合起来如下：

```js
const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

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
```

进行一下测试：

```js
const template = "<div><span>3<5吗</span><span>?</span></div>";
console.log(template);
parseHTML(template, {
    start: (tagName, unary, start, end) => {
        console.log("开始标签：", tagName, unary, start, end);
    },
    end: (tagName, start, end) => {
        console.log("结束标签", tagName, start, end);
    },
    chars: (text, start, end) => {
        console.log("文本", text, start, end);
    },
});

```

输出如下：

![image-20220813153102022](https://windliangblog.oss-cn-beijing.aliyuncs.com/windliangblog.oss-cn-beijing.aliyuncs.comimage-20220813153102022.png)

## 总

上边的代码，对于一个正常的 `html` 文本已经可以解析出 `token` 了，但相对于 `Vue` 的代码还缺少亿点点细节，大家可以结合源代码和霍春阳大佬的 [博客](http://caibaojian.com/vue-design/art/81vue-lexical-analysis.html) 学习，词法这块未来有需要的话我会再进行补充。

当前主要抓模版编译的主干流程，下一篇应该会通过解析出来的 `token` 来生成 `AST` 。

文章对应源码见 [https://vue.windliang.wang/](https://vue.windliang.wang/)。
