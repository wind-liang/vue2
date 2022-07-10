// Browser environment sniffing
export const inBrowser = typeof window !== "undefined";

/* istanbul ignore next */
export function isNative(Ctor) {
    return typeof Ctor === "function" && /native code/.test(Ctor.toString());
}

// can we use __proto__?
export const hasProto = "__proto__" in {};

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
