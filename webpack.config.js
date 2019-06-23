const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  output: {
    filename: 'content.js',
    path: path.resolve(__dirname, 'dest/asset/js'),
    library: 'getCssUsed'
  },
  optimization: {
    minimizer: [new TerserPlugin({
      terserOptions:{
        output:{
          ascii_only:true
        }
      }
    })],
  },
};