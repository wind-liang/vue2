/* istanbul ignore next */
export function isNative(Ctor) {
    return typeof Ctor === "function" && /native code/.test(Ctor.toString());
}

// can we use __proto__?
export const hasProto = "__proto__" in {};
