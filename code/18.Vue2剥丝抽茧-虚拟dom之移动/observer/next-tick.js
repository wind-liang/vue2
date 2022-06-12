import { isNative } from "./env";

const callbacks = [];
let pending = false;

function flushCallbacks() {
    pending = false;
    const copies = callbacks.slice(0);
    callbacks.length = 0;
    for (let i = 0; i < copies.length; i++) {
        copies[i]();
    }
}

let timerFunc;

if (typeof Promise !== "undefined" && isNative(Promise)) {
    const p = Promise.resolve();
    timerFunc = () => {
        p.then(flushCallbacks);
    };
} else {
    // Fallback to setTimeout.
    timerFunc = () => {
        setTimeout(flushCallbacks, 0);
    };
}

export function nextTick(cb, ctx) {
    let _resolve;
    callbacks.push(() => {
        if (cb) {
            cb.call(ctx);
        } else if (_resolve) {
            _resolve(ctx);
        }
    });
    if (!pending) {
        pending = true;
        timerFunc(); // 只执行一次
    }
    // $flow-disable-line
    if (!cb && typeof Promise !== "undefined") {
        return new Promise((resolve) => {
            _resolve = resolve;
        });
    }
}
