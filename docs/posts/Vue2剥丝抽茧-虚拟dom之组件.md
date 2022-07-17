---
title: Vue2剥丝抽茧-虚拟 dom 之组件
categories: 前端
tags:
    - vue2
date: 2022-07-16 17:11:33
---

[虚拟dom](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-VueLiang1.html) 中我们按照  `vue` 本身的目录接口进行了整理，通过 `render` 函数返回虚拟 `dom` 最终完成页面的渲染。这篇文章，我们来实现自定义组件。

## 整体思路

我们需要完成三件事情：

1. 生成自定义组件对应的虚拟 `dom` 
2. 通过自定义组件的虚拟 `dom` 来生成浏览器的 `dom`
3. 自定义组件的响应式

最终我们要把下边的例子跑起来：

```js
import Vue from "./src/platforms/web/entry-runtime";

const Hello = {
    props: {
        title: String,
    },
    data() {
        return {
            text: "component world",
        };
    },
    methods: {
        click() {
            this.text = ",component world";
        },
    },
    render(h) {
        return h(
            "div",
            {
                on: {
                    click: this.click,
                },
            },
            [this.title, this.text]
        );
    },
};
new Vue({
    el: "#root",
    data() {
        return {
            text: "world",
            title: "hello",
        };
    },
    components: { Hello },
    methods: {
        click() {
            this.title = "hello2";
            // this.text = "hello2";
        },
    },
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    // click: this.click,
                },
            },
            [
                createElement("Hello", { props: { title: this.title } }),
                this.text,
            ]
        );
        return test;
    },
});

```

我们定义了一个 `Hello` 组件，在 `new Vue` 中的 `components` 中声明该组件，然后在 `render` 函数的 `createElement` 中直接使用 `Hello` 组件，并且传入 `prop` 的 `title` 值。

## 生成虚拟 dom

虚拟 `dom` 是由 `render` 函数传入的 `createElement` 生成的。

对应的源码就是：

```js
// code/22.Vue2剥丝抽茧-虚拟dom之组件/src/core/vdom/create-element.js
export function _createElement(context, tag, data, children) {
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode();
  }
  if (Array.isArray(data) || isPrimitive(data)) {
    children = data;
    data = undefined;
  }
  children = normalizeChildren(children);
  let vnode = new VNode(tag, data, children, undefined, undefined, context);
  return vnode;
}
```

为了适配自定义组件，生成 `VNode` 的时候我们需要新增判断，如果 `tag` 是 `dom` 的 `tag` 就走原逻辑，否则的话就去走到创建组件的 `vnode` 的逻辑。

```js
export function _createElement(context, tag, data, children) {
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode();
  }
  if (Array.isArray(data) || isPrimitive(data)) {
    children = data;
    data = undefined;
  }
  children = normalizeChildren(children);
  let vnode;
  let Ctor;
  if (config.isReservedTag(tag)) {
    vnode = new VNode(tag, data, children, undefined, undefined, context);
  } else if (
    isDef((Ctor = resolveAsset(context.$options, "components", tag)))
  ) {
    // component
    vnode = createComponent(Ctor, data, context, children, tag);
  }
  return vnode;
}
```

### isReservedTag

判断是否是 `dom` 原生 `tag` 的 `isReservedTag` 函数定义如下：

```js
export const isHTMLTag = makeMap(
    "html,body,base,head,link,meta,style,title," +
        "address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section," +
        "div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul," +
        "a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby," +
        "s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video," +
        "embed,object,param,source,canvas,script,noscript,del,ins," +
        "caption,col,colgroup,table,thead,tbody,td,th,tr," +
        "button,datalist,fieldset,form,input,label,legend,meter,optgroup,option," +
        "output,progress,select,textarea," +
        "details,dialog,menu,menuitem,summary," +
        "content,element,shadow,template,blockquote,iframe,tfoot"
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap(
    "svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face," +
        "foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern," +
        "polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",
    true
);
export const isReservedTag = (tag) => {
    return isHTMLTag(tag) || isSVG(tag);
};
export function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase
        ? (val) => map[val.toLowerCase()]
        : (val) => map[val];
}
```

很简单粗暴，枚举了所有的 `tag` ，然后通过 `makeMap` 生成一个 `map` 进行判断。

### resolveAsset

```js
if (config.isReservedTag(tag)) {
  vnode = new VNode(tag, data, children, undefined, undefined, context);
} else if (
  isDef((Ctor = resolveAsset(context.$options, "components", tag)))
) {
}
```

本质上就是从 `new Vue` 传入的 `options` 的 `components` 属性中拿到当前 `tag` 对应的 `options` 对象。

```js
export function resolveAsset(options, type, id) {
    /* istanbul ignore if */
    if (typeof id !== "string") {
        return;
    }
    const assets = options[type];
    // check local registration variations first
    if (hasOwn(assets, id)) return assets[id];
    const camelizedId = camelize(id);
    if (hasOwn(assets, camelizedId)) return assets[camelizedId];
    const PascalCaseId = capitalize(camelizedId);
    if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId];
    // fallback to prototype chain
    const res = assets[id] || assets[camelizedId] || assets[PascalCaseId];
    return res;
}
```

先判断当前 `options['components']` 有没有我们要的 `tag` 。

然后将 `tag` 调用 `camelize` 驼峰化继续寻找，将形如 `abc-def-ghi` 的名字转为 `abcDefGhi` 。

如果还没找到，就调用 `capitalize` 将驼峰命名转为帕斯卡命名，也就是将驼峰的首字母大写，`abcDefGhi` 转为 `AbcDefGhi` 继续寻找。

`camelize` 方法利用 `replace` 方法结合正则来转换，比较巧妙。

```js
/**
 * Create a cached version of a pure function.
 */
export function cached(fn) {
    const cache = Object.create(null);
    return function cachedFn(str) {
        const hit = cache[str];
        return hit || (cache[str] = fn(str));
    };
}
/**
 * Camelize a hyphen-delimited string.
 */
const camelizeRE = /-(\w)/g;
export const camelize = cached((str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""));
});
```

### createComponent

```js
if (config.isReservedTag(tag)) {
  vnode = new VNode(tag, data, children, undefined, undefined, context);
} else if (
  isDef((Ctor = resolveAsset(context.$options, "components", tag)))
) {
  // component
  vnode = createComponent(Ctor, data, context, children, tag);
}
```

拿到组件对应的 `options` 后，我们就可以调用 `createComponent` 函数来生成 `vnode` 了。

```js
// code/22.Vue2剥丝抽茧-虚拟dom之组件/src/core/vdom/create-component.js
export function createComponent(Ctor, data, context, children, tag) {
    if (isUndef(Ctor)) {
        return;
    }
    const baseCtor = context.$options._base;

    // plain options object: turn it into a constructor
    if (isObject(Ctor)) {
        Ctor = baseCtor.extend(Ctor);
    }

    data = data || {};

    // extract props
    const propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // extract listeners, since these needs to be treated as
    // child component listeners instead of  m DOM listeners
    const listeners = data.on;

    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;
    // install component management hooks onto the placeholder node
    installComponentHooks(data);
    // return a placeholder vnode
    const name = Ctor.options.name || tag;
    const vnode = new VNode(
        `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
        data,
        undefined,
        undefined,
        undefined,
        context,
        { Ctor, propsData, listeners, tag, children }
    );
    return vnode;
}
```

重要的有四个点：

1. 生成 `Ctor` 构造函数。

   ```js
   const baseCtor = context.$options._base;
   
   // plain options object: turn it into a constructor
   if (isObject(Ctor)) {
     Ctor = baseCtor.extend(Ctor);
   }
   ```

   `context.$options._base` 其实就是 `Vue` 构造函数，在 `code/22.Vue2剥丝抽茧-虚拟dom之组件/src/core/global-api/index.js` 中进行初始化的，`Vue.options._base = Vue;`。

   这里的 `extend` 方法就是基于 `Vue` 构造函数，生成一个 `VueComponent` 函数。

   ```js
   Vue.extend = function (extendOptions) {
     extendOptions = extendOptions || {};
     const Super = this;
     const SuperId = Super.cid;
     const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
     if (cachedCtors[SuperId]) {
       return cachedCtors[SuperId];
     }
   
     const name = extendOptions.name || Super.options.name;
   
     const Sub = function VueComponent(options) {
       this._init(options);
     };
     Sub.prototype = Object.create(Super.prototype);
     Sub.prototype.constructor = Sub;
     Sub.cid = cid++;
     Sub.options = mergeOptions(Super.options, extendOptions);
     Sub["super"] = Super;
   
     // For props and computed properties, we define the proxy getters on
     // the Vue instances at extension time, on the extended prototype. This
     // avoids Object.defineProperty calls for each instance created.
     if (Sub.options.props) {
       initProps(Sub);
     }
     if (Sub.options.computed) {
       initComputed(Sub);
     }
   
     // allow further extension/mixin/plugin usage
     Sub.extend = Super.extend;
     Sub.mixin = Super.mixin;
     Sub.use = Super.use;
   
     // create asset registers, so extended classes
     // can have their private assets too.
     ASSET_TYPES.forEach(function (type) {
       Sub[type] = Super[type];
     });
     // enable recursive self-lookup
     if (name) {
       Sub.options.components[name] = Sub;
     }
   
     // keep a reference to the super options at extension time.
     // later at instantiation we can check if Super's options have
     // been updated.
     Sub.superOptions = Super.options;
     Sub.extendOptions = extendOptions;
     Sub.sealedOptions = extend({}, Sub.options);
   
     // cache constructor
     cachedCtors[SuperId] = Sub;
     return Sub;
   };
   ```

   最关键的就是定义了 `Sub` 函数，然后返回，这个函数会在生成 `dom` 的时候用到。

   ```js
   const Sub = function VueComponent(options) {
     this._init(options);
   };
   ```

   其实和我们的 `Vue` 函数长的一样，都是调用 `_init` 方法。

   ```js
   function Vue(options) {
       this._init(options);
   }
   ```

   此外，还对 `Props` 进行了代理：

   ```js
   function initProps(Comp) {
       const props = Comp.options.props;
       for (const key in props) {
           proxy(Comp.prototype, `_props`, key);
       }
   }
   ```

   当我们访问 `this.xxx` 的时候，会取到 `this._props.xxx` ，和 [响应式系统](https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-VueLiang0.html#%E4%BB%A3%E7%90%86) 中介绍的对 `data` 、`methods` 进行代理是一个意思。

2. 传递 `props` 的值

   我们在子组件中定义了 `props` 声明。

   ```js
   props: {
     title: String,
   },
   ```

   具体的 `title` 值就是通过 `extractPropsFromVNodeData` 来拿到。

   ```js
   const propsData = extractPropsFromVNodeData(data, Ctor, tag);
   
   export function extractPropsFromVNodeData(data, Ctor, tag) {
       // we are only extracting raw values here.
       // validation and default values are handled in the child
       // component itself.
       const propOptions = Ctor.options.props;
       if (isUndef(propOptions)) {
           return;
       }
       const res = {};
       const { attrs, props } = data;
       if (isDef(attrs) || isDef(props)) {
           for (const key in propOptions) {
               const altKey = hyphenate(key);
               checkProp(res, props, key, altKey, true) ||
                   checkProp(res, attrs, key, altKey, false);
           }
       }
       return res;
   }
   
   function checkProp(res, hash, key, altKey, preserve) {
       if (isDef(hash)) {
           if (hasOwn(hash, key)) {
               res[key] = hash[key];
               if (!preserve) {
                   delete hash[key];
               }
               return true;
           } else if (hasOwn(hash, altKey)) {
               res[key] = hash[altKey];
               if (!preserve) {
                   delete hash[altKey];
               }
               return true;
           }
       }
       return false;
   }
   ```

   其中也有一个有意思的正则 `hyphenate` 函数：

   ```js
   /**
    * Hyphenate a camelCase string.
    */
   const hyphenateRE = /\B([A-Z])/g;
   export const hyphenate = cached((str) => {
       return str.replace(hyphenateRE, "-$1").toLowerCase();
   });
   ```

   它会将驼峰表达式转为连字符相连并且全部小写的形式，例如 `abcDefGhi` 转为 `abd-def-ghi` 。

3. 安装钩子函数

   ```js
   installComponentHooks(data);
   function installComponentHooks(data) {
       const hooks = data.hook || (data.hook = {});
       for (let i = 0; i < hooksToMerge.length; i++) {
           const key = hooksToMerge[i];
           const existing = hooks[key];
           const toMerge = componentVNodeHooks[key];
           if (existing !== toMerge && !(existing && existing._merged)) {
               hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
           }
       }
   }
   function mergeHook(f1, f2) {
       const merged = (a, b) => {
           // flow complains about extra args which is why we use any
           f1(a, b);
           f2(a, b);
       };
       merged._merged = true;
       return merged;
   }
   
   ```

   把 `data` 中传入的和我们当前定义的 `hooksToMerge` 进行了合并。

   ```js
   // inline hooks to be invoked on component VNodes during patch
   const componentVNodeHooks = {
       init(vnode) {
           const child = (vnode.componentInstance =
               createComponentInstanceForVnode(vnode, activeInstance));
           child.$mount();
       },
       prepatch(oldVnode, vnode) {
           const options = vnode.componentOptions;
           const child = (vnode.componentInstance = oldVnode.componentInstance);
           updateChildComponent(
               child,
               options.propsData, // updated props
               options.listeners, // updated listeners
               vnode, // new parent vnode
               options.children // new children
           );
       },
   };
   const hooksToMerge = Object.keys(componentVNodeHooks);
   ```

   提前定义了两个钩子，`init` 用来生成 `dom` ，`prepatch` 用来更新 `prop` ，后边这两个函数都会用到。

4. 生成 `vnode` ，将参数 `{ Ctor, propsData, listeners, tag, children }` 都放到了 `componentOptions` 中。

   ```js
   const vnode = new VNode(
           `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
           data,
           undefined,
           undefined,
           undefined,
           context,
           { Ctor, propsData, listeners, tag, children }
       );
   ```

   对应的 `VNode` 构造函数：

   ```js
   constructor(
           tag,
           data,
           children,
           text,
           elm,
           context,
           componentOptions,
           asyncFactory
       ) 
   ```

至此 `createElement` 主干就介绍完了，未来调用 `render` 方法就会走到上边的逻辑来生成组件对应的虚拟 `dom` 。

```js
render(createElement) {
  const test = createElement(
    "div",
    {
      on: {
        // click: this.click,
      },
    },
    [
      createElement("Hello", { props: { title: this.title } }),
      this.text,
    ]
  );
  return test;
},
```

## 生成 dom

通过之前的系列文章，我们知道 `dom` 生成是在 `patch`  函数中生成。

```js
function patch(oldVnode, vnode) {
  const isRealElement = isDef(oldVnode.nodeType);
  if (!isRealElement && sameVnode(oldVnode, vnode)) {
    // 通过新旧 vnode 进行更新
    patchVnode(oldVnode, vnode);
  } else {
    // vnode 发生改变或者是第一次渲染
    if (isRealElement) {
      // either not server-rendered, or hydration failed.
      // create an empty node and replace it
      oldVnode = emptyNodeAt(oldVnode);
    }
    // replacing existing element
    const oldElm = oldVnode.elm;
    const parentElm = nodeOps.parentNode(oldElm);

    // create new node
    createElm(vnode, parentElm, nodeOps.nextSibling(oldElm));
    removeVnodes([oldVnode], 0, 0);
  }
  return vnode.elm;
}
```

对于组件，第一次是没有 `oldVnode` 的，因此我们需要加 `if` 条件来判断一下：

```js
function patch(oldVnode, vnode) {
  if (isUndef(oldVnode)) {
    // empty mount (likely as component), create new root element
    createElm(vnode);
  } else {
    ....
  }
  return vnode.elm;
}
```

接下来继续完善 `createElm` 函数。

```js
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
```

原来的 `createElm` 只考虑了 `vnode` 是正常的 `dom`，比如 `div`、`span` 标签这种，没有考虑自定义组件。

我们需要在 `createElm` 开头尝试生成自定义组件的 `dom` ，生成成功就直接 `return` 。

```js
function createElm(vnode, parentElm, refElm) {
  if (createComponent(vnode, parentElm, refElm)) {
    return;
  }
  ...
}
```

重点就是 `createComponent` 函数的实现了

```js
function createComponent(vnode, parentElm, refElm) {
  let i = vnode.data;
  if (isDef(i)) {
    if (isDef((i = i.hook)) && isDef((i = i.init))) {
      i(vnode, false /* hydrating */);
    }
    // after calling the init hook, if the vnode is a child component
    // it should've created a child instance and mounted it. the child
    // component also has set the placeholder vnode's elm.
    // in that case we can just return the element and be done.
    if (isDef(vnode.componentInstance)) {
      initComponent(vnode);
      insert(parentElm, vnode.elm, refElm);
      return true;
    }
  }
}
```

首先就是拿到我们生成 `vnode` 时候的 `init` 钩子进行调用。

```js
if (isDef((i = i.hook)) && isDef((i = i.init))) {
  i(vnode, false /* hydrating */);
}
```

再看一下之前的 `init` 方法。

```js
init(vnode) {
  const child = (vnode.componentInstance =
                 createComponentInstanceForVnode(vnode, activeInstance));
  child.$mount();
},
export function createComponentInstanceForVnode(
    // we know it's MountedComponentVNode but flow doesn't
    vnode,
    // activeInstance in lifecycle state
    parent
) {
    const options = {
        _isComponent: true,
        _parentVnode: vnode,
        parent,
    };
    return new vnode.componentOptions.Ctor(options);
}
```

最终会调用 ` vnode.componentOptions.Ctor` 方法，其实就是前边定义的 `VueComponent` 方法。

```js
const Sub = function VueComponent(options) {
  this._init(options);
};
```

这里的 `_init` 就是 `Vue` 上的 `_init` 了。

```js
Vue.prototype._init = function (options) {
  const vm = this;
  if (options && options._isComponent) {
    // optimize internal component instantiation
    // since dynamic options merging is pretty slow, and none of the
    // internal component options needs special treatment.
    initInternalComponent(vm, options);
  } else {
    vm.$options = mergeOptions(
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    );
  }
  vm._renderProxy = vm;
  initRender(vm);
  initState(vm);
  if (vm.$options.el) {
    vm.$mount(vm.$options.el);
  }
};
```

如果是 `options._isComponent` 为真，我们就调用 `initInternalComponent` 方法。

```js
export function initInternalComponent(vm, options) {
    const opts = (vm.$options = Object.create(vm.constructor.options));
    // doing this because it's faster than dynamic enumeration.
    const parentVnode = options._parentVnode;
    opts.parent = options.parent;
    opts._parentVnode = parentVnode;

    const vnodeComponentOptions = parentVnode.componentOptions;
    opts.propsData = vnodeComponentOptions.propsData;
    opts._parentListeners = vnodeComponentOptions.listeners;
    opts._renderChildren = vnodeComponentOptions.children;
    opts._componentTag = vnodeComponentOptions.tag;

    if (options.render) {
        opts.render = options.render;
        opts.staticRenderFns = options.staticRenderFns;
    }
}
```

主要是将 `componentOptions` 上的各种属性，挂到当前组件的 `options` 上。

最终我们拿到了当前组件对应的 `Vue` 实例，调用 `mount` 方法进行挂载。

```js
init(vnode) {
  const child = (vnode.componentInstance =
                 createComponentInstanceForVnode(vnode, activeInstance));
  child.$mount();
},
```

`mount` 方法就是调用 `render` ，生成 `dom` 同时进行依赖收集。

```js
export function mountComponent(vm, el) {
    vm.$el = el;
    let updateComponent;
    updateComponent = () => {
        vm._update(vm._render());
    };
    // we set this to vm._watcher inside the watcher's constructor
    // since the watcher's initial patch may call $forceUpdate (e.g. inside child
    // component's mounted hook), which relies on vm._watcher being already defined
    new Watcher(vm, updateComponent, noop /* isRenderWatcher */);
    return vm;
}
```

回到最开始的 `createComponent` 函数，上边的一大堆其实就是调用了 `i` 函数，将自定义组件的 `vnode` 变成了 `dom` 。

```js
function createComponent(vnode, parentElm, refElm) {
  let i = vnode.data;
  if (isDef(i)) {
    if (isDef((i = i.hook)) && isDef((i = i.init))) {
      i(vnode, false /* hydrating */);
    }
    // after calling the init hook, if the vnode is a child component
    // it should've created a child instance and mounted it. the child
    // component also has set the placeholder vnode's elm.
    // in that case we can just return the element and be done.
    if (isDef(vnode.componentInstance)) {
      initComponent(vnode);
      insert(parentElm, vnode.elm, refElm);
      return true;
    }
  }
}

function initComponent(vnode) {
  vnode.elm = vnode.componentInstance.$el;
  if (isPatchable(vnode)) {
    invokeCreateHooks(vnode);
  }
}
```

最后我们只需要将生成 `dom` 通过 `insert` 方法挂到父 `dom` 中。

```js
if (isDef(vnode.componentInstance)) {
  initComponent(vnode);
  insert(parentElm, vnode.elm, refElm);
  return true;
}
```

## 组件响应式

### 内部响应式

对于组件内部的 `data`、`computed` ，因为我们给组件生成了一个 `Vue` 实例，`init` 的时候已经进行了响应式的处理。

这里我们只需要补充一下对 `prop` 的响应式处理。

```js
// code/22.Vue2剥丝抽茧-虚拟dom之组件/src/core/instance/state.js
export function initState(vm) {
    const opts = vm.$options;
    if (opts.props) initProps(vm, opts.props);
    if (opts.methods) initMethods(vm, opts.methods);
    if (opts.data) {
        initData(vm);
    } else {
        observe((vm._data = {}));
    }
    if (opts.computed) initComputed(vm, opts.computed);
    if (opts.watch) {
        initWatch(vm, opts.watch);
    }
}
function initProps(vm, propsOptions) {
    debugger;
    var propsData = vm.$options.propsData || {};
    const props = (vm._props = {});
    const keys = (vm.$options._propKeys = []);

    for (const key in propsOptions) {
        keys.push(key);
        const value = propsData[key];
        defineReactive(props, key, value);
        // static props are already proxied on the component's prototype
        // during Vue.extend(). We only need to proxy props defined at
        // instantiation here.
        if (!(key in vm)) {
            proxy(vm, `_props`, key);
        }
    }
}
```

通过 `defineReactive(props, key, value);` 就实现了对于 `prop` 更改的响应式。

### 外部响应式

如果我们给组件传递的值是 `data` 中的变量，

```js
new Vue({
    el: "#root",
    data() {
        return {
            text: "world",
            title: "hello",
        };
    },
    components: { Hello },
    ...
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    // click: this.click,
                },
            },
            [
                createElement("Hello", { props: { title: this.title } }),
                this.text,
            ]
        );
        return test;
    },
});
```

 `title` 变化的时候，我们需要更新组件内部的 `prop` 的值，从而触发内部组件的更新。

当 `title` 更新的时候，会进行新旧 `vnode` 的对比来更新 `dom`，即走到 `patchVnode` 方法。

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
      addVnodes(elm, null, ch, 0, ch.length - 1);
    } else if (isDef(oldCh)) {
      removeVnodes(oldCh, 0, oldCh.length - 1);
    }
  } else if (oldVnode.text !== vnode.text) {
    nodeOps.setTextContent(elm, vnode.text);
  }
}
```

我们可以将内部组件 `prop` 更新放到函数开头，也就是调用之前的 `prepatch` 的钩子。

```js
function patchVnode(oldVnode, vnode) {
  if (oldVnode === vnode) {
    return;
  }

  const elm = (vnode.elm = oldVnode.elm);
  const oldCh = oldVnode.children;
  const ch = vnode.children;
  const data = vnode.data;

  if (isDef(data) && isDef((i = data.hook)) && isDef((i = i.prepatch))) {
    i(oldVnode, vnode);
  }
	...
}
 // i 方法对应于下边的 prepatch
  prepatch(oldVnode, vnode) {
    const options = vnode.componentOptions;
    const child = (vnode.componentInstance = oldVnode.componentInstance);
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    );
  },
```

 `updateChildComponent` 定义如下：

```js
// code/22.Vue2剥丝抽茧-虚拟dom之组件/src/core/instance/lifecycle.js
export function updateChildComponent(
    vm,
    propsData,
    listeners,
    parentVnode,
    renderChildren
) {
    vm.$options._parentVnode = parentVnode;
    vm.$vnode = parentVnode; // update vm's placeholder node without re-render

    if (vm._vnode) {
        // update child tree's parent
        vm._vnode.parent = parentVnode;
    }
    vm.$options._renderChildren = renderChildren;

    // update $attrs and $listeners hash
    // these are also reactive so they may trigger child update if the child
    // used them during render
    vm.$attrs = parentVnode.data.attrs || emptyObject;
    vm.$listeners = listeners || emptyObject;

    // update props
    if (propsData && vm.$options.props) {
        const props = vm._props;
        const propKeys = vm.$options._propKeys || [];
        for (let i = 0; i < propKeys.length; i++) {
            const key = propKeys[i];
            props[key] = propsData[key];
        }
        // keep a copy of raw propsData
        vm.$options.propsData = propsData;
    }
}

```

当我们更新 `props` 值的时候就会触发内部组件的 `render` 函数，实现视图的更新。

## 总

对于自定义组件本质上是通过 `Vue` 生成了一个对象实例，该对象自己内部完成 `dom` 的渲染和响应式更新。然后在父组件适当的位置，通过预先定义的钩子函数去初始化和更新子组件。

核心思想比较简单，主要是各个函数抽离到了各个地方，不同属性挂载的地方也很分散，理顺整个过程到最后 `demo` 跑起来还是花了不少时间。

至此，虚拟 `dom` 也全部介绍完成了，下一篇章会开始「模版编译」了。 


文本对应源码详见：[vue.windliang.wang](https://vue.windliang.wang/)
