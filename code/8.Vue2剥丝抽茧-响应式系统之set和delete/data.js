// https://vue.windliang.wang/posts/Vue2%E5%89%A5%E4%B8%9D%E6%8A%BD%E8%8C%A7-%E5%93%8D%E5%BA%94%E5%BC%8F%E7%B3%BB%E7%BB%9F%E4%B9%8Bset%E5%92%8Cdelete.html
import { observe, set, del } from "./reactive";
import Watcher from "./watcher";
// const data = {
//     list: [1, 2],
// };
// observe(data);
// const updateComponent = () => {
//     console.log(data.list);
// };

// new Watcher(updateComponent);

// list[0] = 3;
// data.list.splice(0, 1, 3);
// set(data.list, 0, 4);
// del(data.list, 0);
// const data = {
//     obj: {
//         a: 1,
//         b: 2,
//     },
// };
// observe(data);
// const updateComponent = () => {
//     const c = data.obj.c ? data.obj.c : 0;
//     console.log(data.obj.a + data.obj.b + c);
// };

// new Watcher(updateComponent);

// data.obj.c = 3;

const data = {
    obj: {
        a: 1,
        b: 2,
    },
};
observe(data);
const updateComponent = () => {
    const c = data.obj.c ? data.obj.c : 0;
    console.log(data.obj.a + data.obj.b + c);
};

const ob = new Watcher(updateComponent);

set(data.obj, "c", 3);

data.obj.c = 5;

del(data.obj, "a");
