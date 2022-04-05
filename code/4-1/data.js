import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
};
observe(data);

const updateComponent = () => {
    const temp = data.text + "liang";
    data.text = temp;
};

new Watcher(updateComponent);
