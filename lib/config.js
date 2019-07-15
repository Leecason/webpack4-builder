const fs = require('fs');
const path = require('path');

const FLOW = 'wpflow'; // webpack flow

class Config {
  static getPath (filename) {
    let current_dir = process.cwd() ;

    while (!fs.existsSync(path.join(current_dir, filename))) { // http://nodejs.cn/api/fs/fs_existssync_path.html
      current_dir = path.join(current_dir, '../');

      // unix 根目录为 /, win32 根目录为 C:\\ 格式
      if (current_dir === '/' || /^[a-zA-Z]:\\$/.test(current_dir)) {
        return false
      }
    }

    return current_dir;
  }

  static getBuildConfig () {
    let builderOptions;

    if (this.getPath(`${FLOW}.json`)) {
      const jsonConfigFile = path.join(this.getPath(`${FLOW}.json`), `./${FLOW}.json`);
      const fileContent = fs.readFileSync(jsonConfigFile, 'utf-8');

      let flowConfig;

      try {
        flowConfig = JSON.parse(fileContent);
      } catch (e) {
        console.error(`Make sure that the ${FLOW}.json configuration is an Object and contains builderOptions field`);
      }

      builderOptions = flowConfig.builderOptions;

      if (!builderOptions) {
        console.error(`Make sure ${FLOW}.json contains builderOptions field`);
      }

      return builderOptions;
    } else if (Config.getPath(`${FLOW}.js`)) {
      const jsonConfigFile = path.join(Config.getPath(`${FLOW}.js`), `./${FLOW}.js`);

      let flowConfig = require(jsonConfigFile);

      builderOptions = flowConfig.builderOptions;

      if (!builderOptions) {
        console.error(`Make sure ${FLOW}.js contains builderOptions field`);
      }

      return builderOptions;
    } else {
      console.error(`${FLOW} configuration file ${FLOW}.json or ${FLOW}.js was not found`);
    }
  }
}

module.exports = Config;
