const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const deepCopy = require('deep-copy');

const Config = require('./config');

let projectRoot = Config.getPath('wpflow.json');

if (!projectRoot) {
  projectRoot = Config.getPath('wpflow.js');
}

const baseConfig = {
  target: 'web', // https://webpack.docschina.org/configuration/target
  entry: glob.sync(path.join(projectRoot, './src/pages/*')),
  module: {
    rules: [],
  },
  plugins: [],
  resolve:{

  },
  // 对体积过大的包进行提示
  performance: {
      hints: 'warning',
      maxAssetSize: 200000,
      maxEntrypointSize: 400000,
      assetFilter: function (assetFilename) {
        return assetFilename.endsWith('.css') || assetFilename.endsWith('.js');
      },
  },
};

class Builder {

  /**
   * @function createDevConfig
   * @static
   * @param {Object} options
   * @param {Number} options.port // devServer#options
   * @param {Boolean} options.inject // html-webpack-plugin#options
   * @returns
   * @memberof Builder
   */
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
    let devPlugins = [];
    // 提取 CSS 为一个单独的文件
    devPlugins.push(this.setMiniCssExtractPlugin());
    // 设置 NODE_ENV 为 development
    devPlugins.push(this.setDefinePlugin('development'));
    // 热更新
    devPlugins.push(new webpack.HotModuleReplacementPlugin());
    // 页面打包
    const { newEntry, htmlWebpackPlugins } = this.setPage({
      entries: devConfig.entry,
      minifyHtml: false,
      inject: options.inject,
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

  /**
   * @function createProdConfig
   * @static
   * @param {Object} options
   * @param {Boolean} options.minifyHTML // html-webpack-plugin#options
   * @param {Boolean} options.minifyJS // uglify js
   * @param {Boolean} options.inject // html-webpack-plugin#options
   * @returns
   * @memberof Builder
   */
  static createProdConfig (options) {
    const prodConfig = deepCopy(baseConfig);
    prodConfig.mode = 'production';

    /* 打包规则 */
    const prodRules = [];
    // HTML 解析规则
    prodRules.push(this.setHtmlRule());
    // 图片解析规则
    prodRules.push(this.setImageRule());
    // CSS 解析规则
    prodRules.push(this.setCssRule());
    // SASS 解析规则，开发环境不压缩
    prodRules.push(this.setSassRule(true));
    // JS 解析规则
    prodRules.push(this.setJsRule());
    // VUE 解析规则
    prodRules.push(this.setVueRule());
    // 字体解析规则
    prodRules.push(this.setFontRule());

    /* 打包插件 */
    let prodPlugins = [];
    // 清空 dist 目录
    prodPlugins.push(new CleanWebpackPlugin(['dist'], {
      root: projectRoot,
      verbose: true,
      dry: false
    }));
    // 提取 CSS 为一个单独的文件
    prodPlugins.push(this.setMiniCssExtractPlugin());
    // 压缩 JS
    if (options.minifyJS) {
      prodPlugins.push(new UglifyJsPlugin({
        uglifyOptions: { // default minify options
            warnings: false,
            parse: {},
            compress: {},
            mangle: true,
            output: null,
            toplevel: false,
            nameCache: null,
            ie8: false,
            keep_fnames: false
        },
        parallel: true,
      }));
    }
    // 设置 NODE_ENV 为 production
    prodPlugins.push(this.setDefinePlugin('production'));
    // TODO: split chunks
    const { newEntry, htmlWebpackPlugins } = this.setPage({
      entries: prodConfig.entry,
      minifyHtml: options.minifyHTML,
      inject: options.inject,
    });
    // 页面打包
    prodPlugins = prodPlugins.concat(htmlWebpackPlugins);
    prodConfig.entry = newEntry;
    prodConfig.output = this.setOutput('/');
    prodConfig.module.rules = prodRules;
    prodConfig.plugins = prodPlugins;
    prodConfig.resolve.extensions = ['.js', '.vue', '.json'];
    // TODO: set alias

    return prodConfig;
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
      options: {
        includePath: [path.join(projectRoot, './src')],
      },
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
      exclude: path.join(projectRoot, 'node_module'),
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

  static setPage ({ entries, minifyHtml, htmlPrefix, inject }) {
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
          template: path.join(projectRoot, `src/${page_name}/index.html`),
          filename: `${file_prefix_path}${page_name}.html`,
          chunks: [page_name],
          inject,
          minify,
        }));
      });

    return {
      newEntry,
      htmlWebpackPlugins,
    };
  }

  static setOutput (publicPath) {
    return {
      filename: `[name]_[chunkhash:8].js`,
      path: path.join(projectRoot, 'dist'),
      publicPath,
    };
  }

  static setDevServer (port = 3000) {
    return {
      contentBase: path.join(projectRoot, './src'),
      disableHostCheck: true,
      historyApiFallback: false,
      compress: true,
      port,
    };
  }

  static setCommonsChunkPlugin () { // TODO: config, migrate to splitChunks
    return new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
    });
  }
}

module.exports = Builder;
