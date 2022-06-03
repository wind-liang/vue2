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
