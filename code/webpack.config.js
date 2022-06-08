const path = require("path");
module.exports = {
    entry: "./17.Vue2剥丝抽茧-虚拟dom之更新",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
