import { hasOwn, camelize, capitalize } from "@/shared/util";
import config from "../config";

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies;

/**
 * Default strategy.
 */
const defaultStrat = function (parentVal, childVal) {
    return childVal === undefined ? parentVal : childVal;
};
/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
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

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
export function mergeOptions(parent, child, vm) {
    if (typeof child === "function") {
        child = child.options;
    }

    const options = {};
    let key;
    for (key in parent) {
        mergeField(key);
    }
    for (key in child) {
        if (!hasOwn(parent, key)) {
            mergeField(key);
        }
    }
    function mergeField(key) {
        const strat = strats[key] || defaultStrat;
        options[key] = strat(parent[key], child[key], vm, key);
    }
    return options;
}
