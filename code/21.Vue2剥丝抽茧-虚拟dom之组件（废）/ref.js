import { remove, isDef } from "./util";

export function registerRef(vnode, isRemoval) {
    const key = vnode.data.ref;
    if (!isDef(key)) return;

    const vm = vnode.context;
    const ref = vnode.componentInstance || vnode.elm;
    const refs = vm.$refs;
    if (isRemoval) {
        if (Array.isArray(refs[key])) {
            remove(refs[key], ref);
        } else if (refs[key] === ref) {
            refs[key] = undefined;
        }
    } else {
        if (vnode.data.refInFor) {
            if (!Array.isArray(refs[key])) {
                refs[key] = [ref];
            } else if (refs[key].indexOf(ref) < 0) {
                // $flow-disable-line
                refs[key].push(ref);
            }
        } else {
            refs[key] = ref;
        }
    }
}
