const path = require("path");
module.exports = {
    entry: "./VueLiang0/vueliang0.js",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "bundle.js",
    },
    devServer: {
        static: path.resolve(__dirname, "./dist"),
    },
};
