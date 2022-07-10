const path = require("path");
module.exports = {
    entry: "./VueLiang1/vueliang1.js",
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            "@": path.join(__dirname, "./VueLiang1/src"),
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
