import Vue from "./src/platforms/web/entry-runtime";

const Hello = {
    props: {
        title: String,
    },
    data() {
        return {
            text: "component world",
        };
    },
    methods: {
        click() {
            this.text = ",component world";
        },
    },
    render(h) {
        return h(
            "div",
            {
                on: {
                    click: this.click,
                },
            },
            [this.title, this.text]
        );
    },
};
new Vue({
    el: "#root",
    data() {
        return {
            text: "world",
            title: "hello",
        };
    },
    components: { Hello },
    methods: {
        click() {
            this.title = "hello2";
            // this.text = "hello2";
        },
    },
    render(createElement) {
        const test = createElement(
            "div",
            {
                on: {
                    // click: this.click,
                },
            },
            [
                createElement("Hello", { props: { title: this.title } }),
                this.text,
            ]
        );
        return test;
    },
});
