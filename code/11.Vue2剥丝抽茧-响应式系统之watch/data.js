// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8Bwatch.html
import { observe } from "./reactive";
import { initWatch } from "./state";
const options = {
    data: {
        first: {
            text: "hello",
        },
        title: "liang",
    },
    watch: {
        "first.text": [
            function (newVal, oldVal) {
                console.log("收到变化", newVal, oldVal);
            },
            function (newVal, oldVal) {
                console.log("收到变化2", newVal, oldVal);
            },
        ],
        title(newVal, oldVal) {
            console.log("收到变化", newVal, oldVal);
        },
    },
};
observe(options.data);
initWatch(options.data, options.watch);

options.data.first.text = "changeText";

options.data.title = "changeTitle";
