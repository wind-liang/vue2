// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
export function isUndef(v) {
    return v === undefined || v === null;
}

export function isDef(v) {
    return v !== undefined && v !== null;
}

/**
 * Check if value is primitive.
 */
export function isPrimitive(value) {
    return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "symbol" ||
        typeof value === "boolean"
    );
}

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

export function isTrue(v) {
    return v === true;
}

export const inBrowser = typeof window !== "undefined";

export let supportsPassive = false;
if (inBrowser) {
    try {
        const opts = {};
        Object.defineProperty(opts, "passive", {
            get() {
                /* istanbul ignore next */
                supportsPassive = true;
            },
        }); // https://github.com/facebook/flow/issues/285
        window.addEventListener("test-passive", null, opts);
    } catch (e) {}
}
