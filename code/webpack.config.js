const path = require("path");
const currentPath = "25.Vue2剥丝抽茧-模版编译之静态render";
module.exports = {
    entry: `./${currentPath}/main.js`,
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
