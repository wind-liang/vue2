import { observe } from "./reactive";
import { initWatch } from "./state";
const options = {
    data: {
        title: "liang",
    },
    watch: {
        title: {
            handler(newVal, oldVal) {
                console.log("收到变化", newVal, oldVal);
            },
            immediate: true,
        },
    },
};
observe(options.data);
initWatch(options.data, options.watch);

options.data.title = "changeTitle";
