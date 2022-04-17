import Watcher from "./watcher";
import { pushTarget, popTarget } from "./dep";

export function initWatch(data, watch) {
    for (const key in watch) {
        const handler = watch[key];
        if (Array.isArray(handler)) {
            for (let i = 0; i < handler.length; i++) {
                createWatcher(data, key, handler[i]);
            }
        } else {
            createWatcher(data, key, handler);
        }
    }
}

function createWatcher(data, expOrFn, handler) {
    return $watch(data, expOrFn, handler);
}

function $watch(data, expOrFn, handler) {
    const watcher = new Watcher(data, expOrFn, handler);
    // if (options.immediate) {
    //     pushTarget();
    //     watcher.value
    //         ? handler.apply(data, [watcher.value])
    //         : handler.call(data);
    //     popTarget();
    // }
    return function unwatchFn() {
        watcher.teardown();
    };
}
