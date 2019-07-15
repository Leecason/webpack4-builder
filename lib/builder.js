const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const deepCopy = require('deep-copy');

const baseConfig = {
  target: 'web', // https://webpack.docschina.org/configuration/target
  cache: true,
  module: {
    rules: [],
  },
  plugins: [],
  resolve:{

  },
};

class Builder {
  static createDevConfig (options) {
    const devConfig = deepCopy(baseConfig);

    const devRules = [];
    // HTML 解析规则
    devRules.push(this.setHtmlRule());
    // 图片解析规则
    devRules.push(this.setImageRule());
    // CSS 解析规则
    devRules.push(this.setCssRule());
    // SASS 解析规则，开发环境不压缩
    devRules.push(this.setSassRule(false));
    // JS 解析规则
    devRules.push(this.setJsRule());
    // VUE 解析规则
    devRules.push(this.setVueRule());
    // 字体解析规则
    devRules.push(this.setFontRule());
  }

  static setHtmlRule () {
    const htmlRules = [];

    htmlRules.push({
      loader: 'html-loader',
    });

    return {
      test: /\.html$/,
      use: htmlRules,
    };
  }

  static setImageRule (pathPrefix) {
    let file_prefix_path = '';

    if (pathPrefix) {
      file_prefix_path = pathPrefix + '/';
    }

    return {
      test: /\.(png|svg|jpg|gif|blob)$/,
      use: {
        loader: 'file-loader',
        options: {
          name: `${file_prefix_path}images/[name]_[hash:8].[ext]`,
        },
      },
    };
  }

  static setCssRule () {
    return {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    };
  }

  static setSassRule (minimize) {
    const sassRules = [];

    sassRules.push({
      loader: MiniCssExtractPlugin.loader,
    });

    const cssLoaderRule = {
      loader: 'css-loader',
      options: {},
    };

    if (minimize) {
      cssLoaderRule.options.minimize = true;
    }

    sassRules.push(cssLoaderRule);

    sassRules.push({
      loader: 'sass-loader',
    });

    return {
      test: /\.sass$/,
      use: sassRules,
    };
  }

  static setJsRule () {
    return {
      test: /\.js$/,
      // include: src
      use: [
        {
          loader: 'babel-loader',
        },
      ],
    };
  }

  static setVueRule () {
    return {
      test: /\.vue$/,
      // exclude: node_module
      use: 'vue-loader',
    };
  }

  static setFontRule () {
    return {
      test: /\.(woff|woff2|eot|ttf|otf)$/,
      use: {
        loader: 'file-loader',
      },
    };
  }
}
