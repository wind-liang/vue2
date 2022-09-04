export class CodegenState {
    staticRenderFns;

    constructor() {
        this.staticRenderFns = [];
    }
}

export function generate(ast) {
    const state = new CodegenState();
    const code = genElement(ast, state);
    return {
        render: `with(this){return ${code}}`,
        staticRenderFns: state.staticRenderFns,
    };
}

export function genElement(el, state) {
    if (el.staticRoot && !el.staticProcessed) {
        return genStatic(el, state);
    } else {
        // component or element
        let code;
        let data; // 先不考虑

        const children = genChildren(el, state);
        code = `_c('${el.tag}'${
            data ? `,${data}` : "" // data
        }${
            children ? `,${children}` : "" // children
        })`;
        return code;
    }
}

function genStatic(el, state) {
    el.staticProcessed = true;
    state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`);
    return `_m(${state.staticRenderFns.length - 1})`;
}
function genNode(node, state) {
    if (node.type === 1) {
        return genElement(node, state);
    } else {
        return genText(node);
    }
}

export function genText(text) {
    // JSON.stringify 是为了给 text 加双引号，作为参数传给 _v
    return `_v(${JSON.stringify(text.text)})`;
}
export function genChildren(el, state) {
    const children = el.children;
    if (children.length) {
        const gen = genNode;
        return `[${children.map((c) => gen(c, state)).join(",")}]`;
    }
}
