// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%B7%B1%E5%BA%A6%E5%93%8D%E5%BA%94.html
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

data.text.innerText.childText = "liang";
data.text = {
    innerText: {
        childText: "liang2",
    },
};

data.text.innerText.childText = "liang3";
