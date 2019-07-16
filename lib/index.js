const webpack = require('webpack');

const Builder = require('./builder');
const Config = require('./config');

const builderOptions = Config.getBuildConfig();
const devConfig = Builder.createDevConfig(builderOptions);
const prodConfig = Builder.createProdConfig(builderOptions);

module.exports = (cmd) => {
  if (cmd === 'dev') {
    // TODO: dev server
  } else if (cmd === 'build') {
    webpack(prodConfig, (_err, stats) => {
      console.log(stats.toString({
        chunks: false,
        colors: true,
        children: false,
      }));
    });
  }
}

module.exports.devConfig = devConfig;
module.exports.prodConfig = prodConfig;
