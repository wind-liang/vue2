// document.getElementById("root").innerText = "hello";
// setTimeout(() => {
//     document.getElementById("root").innerText = "hello2";
//     setTimeout(() => {
//         document.getElementById("root").innerText = "hello3";
//         setTimeout(() => {
//             document.getElementById("root").innerText = "liang";
//         }, 1000);
//     }, 1000);
// }, 1000);

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
