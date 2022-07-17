const path = require("path");
const currentPath = "22.Vue2剥丝抽茧-虚拟dom之组件";
module.exports = {
    entry: `./${currentPath}/vueliang1.js`,
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            "@": path.join(__dirname, `./${currentPath}/src`),
        },
    },
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
