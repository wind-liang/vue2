// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8BnextTick.html
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
import Watcher from "./watcher";
import { nextTick } from "./next-tick";
const data = {
    text: "hello",
};
observe(data);
const updateComponent = () => {
    let i = 1000000000;
    while (i) {
        i--;
    }
    document.getElementById("root").innerText = data.text;
};

new Watcher(updateComponent);

const updateData = () => {
    data.text = "liang";
    console.log(document.getElementById("root").innerText);
    const cb = () => {
        data.text = "tick";
        console.log(document.getElementById("root").innerText);
    };
    nextTick(cb);
};
const updateData2 = async () => {
    data.text = "liang";
    console.log(document.getElementById("root").innerText);
    await nextTick();
    console.log(document.getElementById("root").innerText);
};

updateData();

setTimeout(() => {
    alert(2);
}, 0);
// const p = Promise.resolve();
// p.then(() => {
//     document.getElementById("root").innerText = "promise";
// });
