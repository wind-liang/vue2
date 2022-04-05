// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F.html
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
};
observe(data);

const updateComponent = () => {
    console.log("收到", data.text);
};

new Watcher(updateComponent);

data.text = "hello, liang";

data.text = "hello, liang2";
