const path = require("path");
module.exports = {
    entry: "./19.Vue2剥丝抽茧-虚拟dom之移动/main.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
