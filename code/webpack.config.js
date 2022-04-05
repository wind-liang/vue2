const path = require("path");
module.exports = {
    entry: "./5.Vue2剥丝抽茧-响应式系统之深度响应/data.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
