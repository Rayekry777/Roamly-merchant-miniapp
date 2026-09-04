import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "miniprogram");

describe("阶段 18 入驻页面闭环", () => {
  it("注册四步编辑页和完整预览页", () => {
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")) as {
      pages: string[];
    };

    expect(app.pages).toContain("pages/onboarding/index");
    expect(app.pages).toContain("pages/onboarding/preview");
  });

  it("编辑页包含地图、七日时段、媒体和草稿操作", () => {
    const page = readFileSync(
      resolve(root, "pages/onboarding/index.wxml"),
      "utf8",
    );

    expect(page).toContain('bindtap="chooseLocation"');
    expect(page).toContain('bindchange="toggleClosed"');
    expect(page).toContain('bindtap="chooseLicense"');
    expect(page).toContain('bindtap="chooseGallery"');
    expect(page).toContain('bindtap="saveOnly"');
  });

  it("预览页只从确认按钮提交并遮蔽完整结算账号", () => {
    const page = readFileSync(
      resolve(root, "pages/onboarding/preview.wxml"),
      "utf8",
    );

    expect(page).toContain('bindtap="submit"');
    expect(page).toContain("•••• {{draft.settlementAccountSuffix}}");
    expect(page).not.toContain("settlementAccountNumber");
  });
});
