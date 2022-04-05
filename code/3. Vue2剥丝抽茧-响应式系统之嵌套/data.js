// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%B5%8C%E5%A5%97.html
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    inner: "内部",
};
observe(data);

const updateMyComponent = () => {
    console.log("子组件收到:", data.inner);
};

const updateParentComponent = () => {
    new Watcher(updateMyComponent);
    console.log("父组件收到：", data.text);
};

new Watcher(updateParentComponent);

data.text = "hello, liang";
