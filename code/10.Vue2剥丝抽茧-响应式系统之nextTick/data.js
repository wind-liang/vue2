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
