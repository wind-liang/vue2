import Vue from "./src/platforms/web/entry-runtime";

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
            console.log("调用methods:hello");
            return "调用methods:hello";
        },
        click() {
            this.test = 3;
            this.name = "wind";
        },
    },
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    click: () => this.click(),
                    dblclick: () => this.hello(),
                },
            },
            [this.text, createElement("div", this.test)]
        );
        return test;
    },
});
