// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%88%86%E6%94%AF%E5%88%87%E6%8D%A2.html
import { observe } from "./reactive";
import Watcher from "./watcher";
const data = {
    text: "hello, world",
    ok: true,
};
observe(data);

const updateComponent = () => {
    console.log("收到", data.ok ? data.text : "not");
};

new Watcher(updateComponent); // updateComponent 执行一次函数，输出 hello, world

data.ok = false; // updateComponent 执行一次函数，输出 not

data.text = "hello, liang"; // updateComponent 会执行吗？
