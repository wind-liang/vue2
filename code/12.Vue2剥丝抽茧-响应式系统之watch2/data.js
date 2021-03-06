// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8Bwatch2.html
import { observe } from "./reactive";
import { initWatch } from "./state";
const options = {
    data: {
        info: {
            name: {
                firstName: "wind",
                secondName: "liang",
            },
        },
    },
    watch: {
        "info.name": {
            handler(newVal, oldVal) {
                console.log("收到变化", newVal, oldVal);
            },
            deep: true,
        },
    },
};
observe(options.data);
initWatch(options.data, options.watch);

options.data.info = {
    name: {
        firstName: "wind2",
        secondName: "liang2",
    },
};

// setTimeout(() => {
//     options.data.info.name = {
//         firstName: "wind2",
//         secondName: "liang2",
//     };
// }, 0);

options.data.info.name = {
    firstName: "wind2",
    secondName: "liang2",
};

setTimeout(() => {
    options.data.info.name.firstName = "wind3";
}, 0);
