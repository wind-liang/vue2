let isPlatformReservedTag;
export function optimize(root, options) {
    if (!root) return;
    isPlatformReservedTag = options.isReservedTag;
    // first pass: mark all non-static nodes.
    markStatic(root);
    // second pass: mark static roots.
    markStaticRoots(root);
}
function markStatic(node) {
    node.static = isStatic(node);
    if (node.type === 1) {
        // do not make component slot content static. this avoids
        // 1. components not able to mutate slot nodes
        // 2. static slot content fails for hot-reloading
        if (!isPlatformReservedTag(node.tag)) {
            return;
        }
        for (let i = 0, l = node.children.length; i < l; i++) {
            const child = node.children[i];
            markStatic(child);
            if (!child.static) {
                node.static = false;
            }
        }
    }
}
function markStaticRoots(node) {
    if (node.type === 1) {
        // For a node to qualify as a static root, it should have children that
        // are not just static text. Otherwise the cost of hoisting out will
        // outweigh the benefits and it's better off to just always render it fresh.
        if (
            node.static &&
            node.children.length &&
            !(node.children.length === 1 && node.children[0].type === 3)
        ) {
            node.staticRoot = true;
            return;
        } else {
            node.staticRoot = false;
        }
        if (node.children) {
            for (let i = 0, l = node.children.length; i < l; i++) {
                markStaticRoots(node.children[i]);
            }
        }
    }
}

function isStatic(node) {
    if (node.type === 2) {
        // expression
        return false;
    }
    if (node.type === 3) {
        // text
        return true;
    }
    return isPlatformReservedTag(node.tag);
}
