const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
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
    devConfig.mode = 'development';
    /* 打包规则 */
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

    /* 打包插件 */
    const devPlugins = [];
    // 提取 CSS 为一个单独的文件
    devPlugins.push(this.setMiniCssExtractPlugin());
    // 设置 NODE_ENV 为 development
    devPlugins.push(this.setDefinePlugin('development'));
    // 热更新
    devPlugins.push(new webpack.HotModuleReplacementPlugin());
    // 页面打包
    const { newEntry, htmlWebpackPlugins } = this.setPage({
      entries: options.entry,
      minifyHtml: false,
    })
    devPlugins = devPlugins.concat(htmlWebpackPlugins);

    devConfig.entry = newEntry;
    // source-map
    devConfig.devtool = 'inline-source-map';
    devConfig.output = this.setOutput('/');
    devConfig.modules.rules = devRules;
    devConfig.plugins = devPlugins;
    devConfig.devServer = this.setDevServer(options.port);
    devConfig.resolve.extensions = ['.js', '.vue', '.json'];

    // TODO: set alias

    return devConfig;
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

  static setMiniCssExtractPlugin (pathPrefix) {
    let file_prefix_path = '';

    if (pathPrefix) {
      file_prefix_path = pathPrefix + '/';
    }

    return new MiniCssExtractPlugin({
      filename: `${file_prefix_path}[name]_[contenthash:8].css`,
    });
  }

  static setDefinePlugin (env) {
    return new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
    });
  }

  static setPage ({ entries, minifyHtml, htmlPrefix}) {
    const newEntry = {},
          htmlWebpackPlugins = [];

    Object
      .keys(entries)
      .forEach((index) => {
        const entry_file = entries[index];

        const match = entry_file.match(/\/src\/(.*)\/index\.js/),
              page_name = match && match[1];

        let file_prefix_path = '';
        if (htmlPrefix) {
          file_prefix_path = htmlPrefix + '/';
        }

        newEntry[page_name] = entry_file;

        let minify = false;
        if (minifyHtml) {
          minify = {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          };
        }

        htmlWebpackPlugins.push(new HtmlWebpackPlugin({
          template: path.join(__dirname, `src/${page_name}/index.html`),
          filename: `${file_prefix_path}${page_name}.html`,
          chunks: [page_name],
          inject: true, // TODO: config
          minify,
        }));
      });

    return {
      newEntry,
      hmlWebpackPlugins,
    };
  }

  static setOutput (publicPath) {
    return {
      filename: `[name]_[chunkhash:8].js`,
      publicPath,
    };
  }

  static setDevServer (port = 3000) {
    return {
      contentBase: path.join(__dirname, './src'),
      disableHostCheck: true,
      historyApiFallback: false,
      compress: true,
      port,
    };
  }
}
