const path = require('path');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== "production"

module.exports = {
    entry: './src/index.js',
    mode: isDevelopment?'development':'production',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                options: { presets: ["@babel/env"]}
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    },
    resolve: { extensions: ["*", ".js", ".jsx"]},
    output: {
        path: path.resolve(__dirname, "public/"),
        filename: "bundle.js",
        clean: false
    },
    devServer: {
        port: 3000,
        hot: true,
    },
    plugins: [isDevelopment && new ReactRefreshWebpackPlugin()].filter(Boolean),
};