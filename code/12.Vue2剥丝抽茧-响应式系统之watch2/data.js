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
