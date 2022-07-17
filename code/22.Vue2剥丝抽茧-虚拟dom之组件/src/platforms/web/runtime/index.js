/* @flow */

import Vue from "@/core/index";
import { noop } from "@/shared/util";
import { mountComponent } from "@/core/instance/lifecycle";
import { inBrowser } from "@/core/util/index";

import { patch } from "./patch";
import {
    isReservedTag,
    getTagNamespace,
    isUnknownElement,
} from "../util/index";

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;
// install platform specific utils
// Vue.config 在 /src/core/global-api/index.js 初始化，这里进行覆盖
Vue.config.isReservedTag = isReservedTag;
Vue.config.getTagNamespace = getTagNamespace;
Vue.config.isUnknownElement = isUnknownElement;

// public mount method
Vue.prototype.$mount = function (el) {
    el = el && document.querySelector(el);
    return mountComponent(this, el);
};

export default Vue;
