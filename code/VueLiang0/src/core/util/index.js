/**
 * unicode letters used for parsing html tags, component names and property paths.
 * using https://www.w3.org/TR/html53/semantics-scripting.html#potentialcustomelementname
 * skipping \u10000-\uEFFFF due to it freezing up PhantomJS
 */
export const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

/**
 * Remove an item from an array.
 */
export function remove(arr, item) {
    if (arr.length) {
        const index = arr.indexOf(item);
        if (index > -1) {
            return arr.splice(index, 1);
        }
    }
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 */
export function isObject(obj) {
    return obj !== null && typeof obj === "object";
}

/**
 * Define a property.
 */
export function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true,
    });
}

// can we use __proto__?
export const hasProto = "__proto__" in {};

/**
 * Check if val is a valid array index.
 */
export function isValidArrayIndex(val) {
    const n = parseFloat(String(val));
    return n >= 0 && Math.floor(n) === n && isFinite(val);
}

/**
 * Check whether an object has the property.
 */
const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj, key) {
    return hasOwnProperty.call(obj, key);
}

/**
 * Parse simple path.
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
export function parsePath(path) {
    if (bailRE.test(path)) {
        return;
    }
    const segments = path.split(".");
    return function (obj) {
        for (let i = 0; i < segments.length; i++) {
            if (!obj) return;
            obj = obj[segments[i]];
        }
        return obj;
    };
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
const _toString = Object.prototype.toString;

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
export function isPlainObject(obj) {
    return _toString.call(obj) === "[object Object]";
}

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 */
export function noop(a, b, c) {}

export * from "./next-tick";

/**
 * Check if a string starts with $ or _
 */
export function isReserved(str) {
    const c = (str + "").charCodeAt(0);
    return c === 0x24 || c === 0x5f;
}

function nativeBind(fn, ctx) {
    return fn.bind(ctx);
}

export const bind = Function.prototype.bind ? nativeBind : polyfillBind;
