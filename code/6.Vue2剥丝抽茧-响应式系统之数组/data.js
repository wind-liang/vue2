import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: {
        innerText: {
            childText: "hello",
        },
    },
};
observe(data);
const updateComponent = () => {
    console.log(data.text.innerText.childText);
};

new Watcher(updateComponent);
data.text = {
    innerText: {
        childText: "liang",
    },
};
