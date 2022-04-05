import { observe } from "./reactive";
import Watcher from "./watcher";
// const data = {
//     text: [1],
// };
// observe(data);
// const updateComponent = () => {
//     console.log(data.text);
// };

// new Watcher(updateComponent);

// data.text = [2, 3];

// data.text.push(4);

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

data.text.innerText.childText = 1;
// data.text = [2, 3];

// data.text.push(4);
