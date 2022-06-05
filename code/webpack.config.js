const path = require("path");
module.exports = {
    entry: "./16.Vue2剥丝抽茧-虚拟dom之绑定事件/main.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
