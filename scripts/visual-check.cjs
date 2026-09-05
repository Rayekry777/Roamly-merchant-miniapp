const fs = require("node:fs/promises");
const path = require("node:path");
const automator = require("miniprogram-automator");
const MiniProgram = require("miniprogram-automator/out/MiniProgram").default;
const sharp = require("sharp");

const originalCheckVersion = MiniProgram.prototype.checkVersion;
MiniProgram.prototype.checkVersion = async function checkVersionCompat() {
  try {
    return await originalCheckVersion.call(this);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("split")) return;
    throw error;
  }
};

const projectPath = path.resolve(__dirname, "..");
const cliPath = process.env.WECHAT_DEVTOOLS_CLI || "D:/wxdev/cli.bat";
const outputRoot = path.resolve(projectPath, "artifacts/ui-qa/latest");
const referenceRoot = path.resolve(
  process.env.ROAMLY_VISUAL_REFERENCE_DIR ||
    path.join(projectPath, "artifacts/ui-qa/references"),
);
const phone = process.env.ROAMLY_VISUAL_PHONE || "13900000001";
const code = process.env.ROAMLY_VISUAL_CODE || "123456";
const automationPort = Number(process.env.WECHAT_AUTOMATION_PORT || 9420);

const cases = [
  {
    name: "home-expanded",
    reference: "home-expanded.png",
    route: "/pages/workbench/index",
    scrollTop: 0,
  },
  {
    name: "home-collapsed",
    reference: "home-collapsed.png",
    route: "/pages/workbench/index",
    scrollTop: 120,
  },
  {
    name: "me",
    reference: "me.png",
    route: "/pages/me/index",
    scrollTop: 0,
  },
];

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForRoute(miniProgram, expected, timeout = 12000) {
  const normalizedExpected = expected.replace(/^\//, "");
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const page = await miniProgram.currentPage();
    if (page.path.replace(/^\//, "") === normalizedExpected) return page;
    await wait(350);
  }
  const current = await miniProgram.currentPage();
  throw new Error(`页面跳转超时：期望 ${expected}，当前 ${current.path}`);
}

async function ensureLoggedIn(miniProgram) {
  let page = await miniProgram.currentPage();
  if (page.path.replace(/^\//, "") !== "pages/login/index") return;
  const inputs = await page.$$("input");
  const buttons = await page.$$("button");
  if (inputs.length < 2 || buttons.length < 2) {
    throw new Error("无法识别登录页，请先确认小程序已完成编译");
  }
  await inputs[0].input(phone);
  await buttons[0].tap();
  await wait(600);
  await inputs[1].input(code);
  await buttons[1].tap();
  page = await waitForRoute(miniProgram, "/pages/workbench/index");
  await page.waitFor(900);
}

async function capture(miniProgram, item) {
  const current = await miniProgram.currentPage();
  if (current.path.replace(/^\//, "") !== item.route.replace(/^\//, "")) {
    const result = await miniProgram.callWxMethod("switchTab", {
      url: item.route,
    });
    if (!result?.errMsg?.includes("ok")) {
      throw new Error(result?.errMsg || `无法切换到 ${item.route}`);
    }
  }
  await waitForRoute(miniProgram, item.route);
  await miniProgram.pageScrollTo(item.scrollTop);
  await wait(500);
  const target = path.join(outputRoot, `${item.name}.png`);
  await miniProgram.screenshot({ path: target });
  return target;
}

async function compare(referencePath, implementationPath, name) {
  const referenceMeta = await sharp(referencePath).metadata();
  if (!referenceMeta.width || !referenceMeta.height) {
    throw new Error(`无法读取参考图尺寸：${referencePath}`);
  }
  const width = referenceMeta.width;
  const height = referenceMeta.height;
  const normalized = await sharp(implementationPath)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
  const reference = await sharp(referencePath).png().toBuffer();
  await fs.writeFile(
    path.join(outputRoot, `${name}-normalized.png`),
    normalized,
  );

  const labelHeight = Math.max(54, Math.round(width * 0.046));
  const label = Buffer.from(
    `<svg width="${width * 2}" height="${labelHeight}">
      <rect width="100%" height="100%" fill="#242331"/>
      <text x="${width / 2}" y="${labelHeight * 0.68}" text-anchor="middle" fill="white" font-size="${Math.round(labelHeight * 0.42)}" font-family="sans-serif">参考图</text>
      <text x="${width * 1.5}" y="${labelHeight * 0.68}" text-anchor="middle" fill="white" font-size="${Math.round(labelHeight * 0.42)}" font-family="sans-serif">Roamly 实现</text>
    </svg>`,
  );
  await sharp({
    create: {
      width: width * 2,
      height: height + labelHeight,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: label, top: 0, left: 0 },
      { input: reference, top: labelHeight, left: 0 },
      { input: normalized, top: labelHeight, left: width },
    ])
    .png()
    .toFile(path.join(outputRoot, `${name}-side-by-side.png`));

  await sharp(normalized)
    .composite([{ input: reference, blend: "over", opacity: 0.5 }])
    .png()
    .toFile(path.join(outputRoot, `${name}-overlay.png`));
}

async function main() {
  await fs.mkdir(outputRoot, { recursive: true });
  for (const item of cases) {
    await fs.access(path.join(referenceRoot, item.reference));
  }
  let miniProgram;
  try {
    try {
      miniProgram = await automator.connect({
        wsEndpoint: `ws://127.0.0.1:${automationPort}`,
      });
    } catch {
      miniProgram = await automator.launch({
        cliPath,
        projectPath,
        trustProject: true,
        timeout: 60000,
        port: automationPort,
      });
    }
    await miniProgram.reLaunch("/pages/workbench/index");
    await wait(800);
    await ensureLoggedIn(miniProgram);
    const systemInfo = await miniProgram.systemInfo();
    const captures = {};
    for (const item of cases) {
      const implementation = await capture(miniProgram, item);
      const reference = path.join(referenceRoot, item.reference);
      await compare(reference, implementation, item.name);
      captures[item.name] = { implementation, reference };
    }
    await fs.writeFile(
      path.join(outputRoot, "manifest.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          viewport: {
            windowWidth: systemInfo.windowWidth,
            windowHeight: systemInfo.windowHeight,
            pixelRatio: systemInfo.pixelRatio,
          },
          target: { width: 393, height: 852, pixelRatio: 3 },
          captures,
        },
        null,
        2,
      ),
    );
    if (Math.abs(systemInfo.windowWidth - 393) > 2) {
      console.warn(
        `视觉提示：当前模拟器宽度为 ${systemInfo.windowWidth}px，请切换到 393px 宽设备进行最终验收。`,
      );
    }
    console.log(`视觉对比已生成：${outputRoot}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `视觉检查未完成：${message}。请启动本地后端、登录微信开发者工具并确认“安全设置 → 服务端口”已开启。`,
    );
  } finally {
    if (miniProgram) miniProgram.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
