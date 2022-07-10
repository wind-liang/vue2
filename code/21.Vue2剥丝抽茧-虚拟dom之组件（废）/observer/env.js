/* istanbul ignore next */
export function isNative(Ctor) {
    return typeof Ctor === "function" && /native code/.test(Ctor.toString());
}
