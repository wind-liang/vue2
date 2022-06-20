const path = require("path");
module.exports = {
    entry: "./20.Vue2剥丝抽茧-虚拟dom之增删/main.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
