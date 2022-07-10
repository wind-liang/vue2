/* @flow */

import VNode from "./vnode";
import { extractPropsFromVNodeData } from "./extract-props";

export function createComponent(Ctor, data, context, children, tag) {
    if (isUndef(Ctor)) {
        return;
    }
    data = data || {};

    // extract props
    const propsData = extractPropsFromVNodeData(data, Ctor, tag);

    // extract listeners, since these needs to be treated as
    // child component listeners instead of DOM listeners
    const listeners = data.on;

    // replace with listeners with .native modifier
    // so it gets processed during parent component patch.
    data.on = data.nativeOn;

    // return a placeholder vnode
    const name = Ctor.options.name || tag;
    const vnode = new VNode(
        `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
        data,
        undefined,
        undefined,
        undefined,
        context,
        { Ctor, propsData, listeners, tag, children },
        asyncFactory
    );
    return vnode;
}
