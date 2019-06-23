const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './test/index.js',
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './test'
  },
  output: {
    filename: 'index.build.js',
    path: path.resolve(__dirname, 'test/')
  }
};