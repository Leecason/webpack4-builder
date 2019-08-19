const webpack = require('webpack');
const rimraf = require('rimraf');

function test () {
  process.chdir(__dirname); // 切换到当前 template-project
  const builder = require('../../lib/index');

  let prodConfig = builder.prodConfig;

  // 清除 dist 目录
  rimraf('./dist', () => {
    webpack(prodConfig, (err, stats) => {
      if (err) {
        console.error('webpack配置错误');
        console.error(err.stack || err);

        if (err.details) {
            console.error(err.details);
        }
      }
    })
  })
}


test();
