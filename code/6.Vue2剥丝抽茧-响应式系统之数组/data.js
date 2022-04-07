// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E6%95%B0%E7%BB%84.html
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
