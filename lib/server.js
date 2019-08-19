const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const Config = require('./config');
const buildOptions = Config.getBuildConfig();

const app = express();

module.exports = devConfig => {
  for (let key in devConfig.entry) {
    if (buildOptions.hot) {
      devConfig.entry[key] = [
        'webpack-hot-middleware/client?dynamicPublicPath=true&noInfo=true&reload=true',
        devConfig.entry[key],
      ];
    } else {
      devConfig.entry[key] = [
        devConfig.entry[key]
      ];
    }
  }
  const compiler = webpack(devConfig);

  // 配置 devServer
  app.use(
    webpackDevMiddleware(compiler, {
      hot: true,
      color: true,
    })
  );
  // 热更新中间件
  app.use(webpackHotMiddleware(compiler));

  // serve on port
  const { port } = devConfig.devServer;

  app.listen(port, function(res, err) {
    if (err) {
      console.log(err);
    } else {
      console.log(
        `Webpack server listening on port ${port}\n`
      );
    }
  });
};
