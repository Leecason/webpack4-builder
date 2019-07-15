const Builder = require('./builder');
const Config = require('./config');

const builderOptions = Config.getBuildConfig();
const devConfig = Builder.createDevConfig(builderOptions);
const prodConfig = Builder.createProdConfig(builderOptions);

module.exports.devConfig = devConfig;
module.exports.prodConfig = prodConfig;
