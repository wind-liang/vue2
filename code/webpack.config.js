const path = require("path");
const currentPath = "24.Vue2剥丝抽茧-模版编译之生成AST";
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
