import { observe } from "./reactive";
import { initComputed } from "./state";
import Watcher from "./watcher";
const options = {
    data: {
        firstName: "wind",
        secondName: "liang",
        title: "标题",
    },
    computed: {
        name() {
            console.log("name我执行啦！");
            return this.firstName + this.secondName;
        },

        test: {
            get() {
                return this.title;
            },
            set() {
                console.log("set");
            },
        },
    },
};
observe(options.data);
initComputed(options.data, options.computed);

const updateComponent = () => {
    console.log("updateComponent执行啦！");
    document.getElementById("root").innerText =
        options.data.name + options.data.title;
};

new Watcher(options.data, updateComponent);
options.data.test = "a";
// setTimeout(() => {
//     options.data.firstName = "wind2";
// }, 1000);

// setTimeout(() => {
//     options.data.title = "修改标题";
//     setTimeout(() => {
//         options.data.firstName = "wind2";
//     }, 1000);
// }, 1000);

// const options = {
//     data: {
//         firstName: "wind",
//         secondName: "liang",
//     },
//     computed: {
//         name() {
//             console.log("name我执行啦！");
//             return this.firstName + this.secondName;
//         },
//     },
// };
// observe(options.data);

// const noop = () => {};
// const watcher = new Watcher(options.data, options.computed.name, noop, {
//     lazy: true,
// });
// console.log(watcher.value);
// watcher.evaluate();
// console.log(watcher.value);

// console.log("修改 firstName 的值");
// options.data.firstName = "wind2";
// setTimeout(() => {
//     if (watcher.dirty) {
//         watcher.evaluate();
//     }
//     console.log(watcher.value);
// });
