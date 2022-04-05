import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    list: ["hello"],
};
observe(data);
const updateComponent = () => {
    for (const item of data.list) {
        console.log(item);
    }
};

new Watcher(updateComponent);
// data.list = ["hello", "liang"];

data.list = ["hello", "liang"];

data.list.push("liang");
