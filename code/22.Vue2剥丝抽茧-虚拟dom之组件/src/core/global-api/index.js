import { set, del } from "../observer/index";
import config from "../config";
import { initExtend } from "./extend";

import { nextTick } from "../util/index";

export function initGlobalAPI(Vue) {
    // config
    const configDef = {};
    configDef.get = () => config;
    if (process.env.NODE_ENV !== "production") {
        configDef.set = () => {
            console.warn(
                "Do not replace the Vue.config object, set individual fields instead."
            );
        };
    }
    Vue.options = Object.create(null);
    Object.defineProperty(Vue, "config", configDef);
    // this is used to identify the "base" constructor to extend all plain-object
    // components with in Weex's multi-instance scenarios.
    Vue.options._base = Vue;
    Vue.set = set;
    Vue.delete = del;
    Vue.nextTick = nextTick;

    initExtend(Vue);
}
