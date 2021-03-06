// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8B%E5%BC%82%E6%AD%A5%E9%98%9F%E5%88%97.html
import { observe } from "./reactive";
import Watcher from "./watcher";

const data = {
    a: 1,
    b: 2,
    c: 3,
};
observe(data);
const updateComponent = () => {
    console.log(data.a + data.b);
};

new Watcher(updateComponent);

const updateComponent2 = () => {
    console.log(data.c);
};
new Watcher(updateComponent2);

data.a = 2;
data.a = 3;
data.b = 4;

data.c = 5;
