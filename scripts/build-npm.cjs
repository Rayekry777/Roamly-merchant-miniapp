const path = require("node:path");
const ci = require("miniprogram-ci");

async function build() {
  const root = path.resolve(__dirname, "..");
  const result = await ci.packNpmManually({
    packageJsonPath: path.join(root, "package.json"),
    miniprogramNpmDistDir: path.join(root, "miniprogram"),
  });
  if (result.warnList.length) console.warn(result.warnList);
  console.log(`微信 npm 构建完成：小程序依赖 ${result.miniProgramPackNum} 个`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
