/* @flow */

import Vue from "@/core/index";
import { noop } from "@/shared/util";
import { mountComponent } from "@/core/instance/lifecycle";
import { inBrowser } from "@/core/util/index";

import { patch } from "./patch";
// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;

// public mount method
Vue.prototype.$mount = function (el) {
    el = el && document.querySelector(el);
    return mountComponent(this, el);
};

export default Vue;
