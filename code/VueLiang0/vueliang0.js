import Vue from "./src/core/index";

new Vue({
    el: "#root",
    data() {
        return {
            test: 1,
            name: "data:liang",
        };
    },
    watch: {
        test(newVal, oldVal) {
            console.log(newVal, oldVal);
        },
    },
    computed: {
        text() {
            return "computed:hello:" + this.name;
        },
    },
    methods: {
        hello() {
            return "调用methods:hello";
        },
        click() {
            this.test = 3;
            this.name = "wind";
        },
    },
    render() {
        const node = document.createElement("div");

        const dataNode = document.createElement("div");
        dataNode.innerText = this.test;
        node.append(dataNode);

        const computedNode = document.createElement("div");
        computedNode.innerText = this.text;
        node.append(computedNode);

        const methodsNode = document.createElement("div");
        methodsNode.innerText = this.hello();
        node.append(methodsNode);

        node.addEventListener("click", this.click);
        return node;
    },
});
