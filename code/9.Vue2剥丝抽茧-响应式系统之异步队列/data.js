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
