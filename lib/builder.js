const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const SriPlugin = require('webpack-subresource-integrity');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

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
  resolveLoader: {

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
    // Vue Loader 插件，将你定义过的其它规则复制并应用到 .vue 文件里相应语言的块
    devPlugins.push(new VueLoaderPlugin());
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
    devConfig.module.rules = devRules;
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
    // 优化/压缩 CSS 文件的输出
    prodPlugins.push(this.setOptimizeCssAssetsPlugin());
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
    // Vue Loader 插件，将你定义过的其它规则复制并应用到 .vue 文件里相应语言的块
    prodPlugins.push(new VueLoaderPlugin());
    // TODO: split chunks
    const { newEntry, htmlWebpackPlugins } = this.setPage({
      entries: prodConfig.entry,
      minifyHtml: options.minifyHTML,
      inject: options.inject,
    });
    // 页面打包
    prodPlugins = prodPlugins.concat(htmlWebpackPlugins);
    // 保证页面引用资源的完整性
    prodPlugins.push(this.setSriPlugin());

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
    /*
      {
        test: '/\.scss$/',
        use: [
          MiniCssExtractPlugin.loader
          'vue-style-loader'
          'css-loader'
          'postcss-loader'
          'sass-loader'
        ]
      }
    */
    const sassRules = [];

    sassRules.push({
      loader: MiniCssExtractPlugin.loader,
    });

    sassRules.push({
      loader: 'vue-style-loader',
    });

    const cssLoaderRule = {
      loader: 'css-loader',
      options: {},
    };

    if (minimize) { // 是否开启压缩
      cssLoaderRule.options.minimize = true;
    }

    sassRules.push(cssLoaderRule);

    // 兼容低版本浏览器
    sassRules.push({ loader: "postcss-loader" });
    // 雪碧图
    sassRules.push({ loader: "sprites-loader" });

    sassRules.push({
      loader: 'sass-loader',
      options: {
        includePath: [path.join(projectRoot, './src')],
        indentedSyntax: true,
      },
    });

    return {
      test: /\.scss$/,
      use: sassRules,
    };
  }

  static setJsRule () {
    return {
      test: /\.js$/,
      include: path.join(projectRoot, 'src'),
      use: [
        {
          loader: 'thread-loader',
          options: {
              workers: 3,
          },
        },
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

  static setMiniCssExtractPlugin (cssPrefix) {
    let css_prefix_path = '';

    if (cssPrefix) {
      css_prefix_path = cssPrefix + '/';
    }

    return new MiniCssExtractPlugin({
      filename: `${css_prefix_path}[name]_[contenthash:8].css`,
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
        const entry = entries[index];
        const entry_file = `${entry}/index.js`;

        const match = entry.match(/\/pages\/(.*)/),
              page_name = match && match[1];

        let html_prefix_path = '';
        if (htmlPrefix) {
          html_prefix_path = htmlPrefix + '/';
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
          template: path.join(projectRoot, `src/pages/${page_name}/index.html`),
          filename: `${html_prefix_path}${page_name}.html`,
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

  static setOutput (publicPath, jsPrefix) {
    let js_prefix_path = '';
    if (jsPrefix) {
      js_prefix_path = jsPrefix;
    }

    return {
      filename: '[name]_[chunkhash:8].js',
      path: path.join(projectRoot, `dist/${js_prefix_path}`),
      publicPath,
      crossOriginLoading: 'anonymous',
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
  // 确保页面引入资源的完整性，避免恶意代码执行，解决 CDN 劫持，防止 XSS 攻击
  static setSriPlugin () {
    return new SriPlugin({
      hashFuncNames: ['sha256', 'sha384'],
    });
  }

  static setOptimizeCssAssetsPlugin () {
    return new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessor: require('cssnano'),
    });
  }
}

module.exports = Builder;
