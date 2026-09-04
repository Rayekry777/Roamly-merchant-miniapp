import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "miniprogram");

describe("阶段 20 商户建券页面闭环", () => {
  it("注册列表、四步编辑和消费者视角预览", () => {
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")) as {
      pages: string[];
    };

    expect(app.pages).toContain("pages/vouchers/index");
    expect(app.pages).toContain("pages/vouchers/editor");
    expect(app.pages).toContain("pages/vouchers/preview");
  });

  it("列表具备筛选、新建、预览、复制和删除命令", () => {
    const page = readFileSync(
      resolve(root, "pages/vouchers/index.wxml"),
      "utf8",
    );

    expect(page).toContain('bindtap="createVoucher"');
    expect(page).toContain('bindtap="selectReview"');
    expect(page).toContain('bindchange="changeType"');
    expect(page).toContain('bindtap="preview"');
    expect(page).toContain('bindtap="copy"');
    expect(page).toContain('bindtap="remove"');
  });

  it("编辑页覆盖四类专属字段、七日时段、媒体和409恢复", () => {
    const page = readFileSync(
      resolve(root, "pages/vouchers/editor.wxml"),
      "utf8",
    );

    expect(page).toContain("currentStep === 0");
    expect(page).toContain("currentStep === 1");
    expect(page).toContain("currentStep === 2");
    expect(page).toContain("packageItems");
    expect(page).toContain("faceValueYuan");
    expect(page).toContain("discountRate");
    expect(page).toContain("totalUseCount");
    expect(page).toContain('bindchange="toggleUsageDay"');
    expect(page).toContain('bindtap="chooseCover"');
    expect(page).toContain('bindtap="chooseDetails"');
    expect(page).toContain('bindtap="reapplyConflict"');
    expect(page).toContain('bindtap="saveOnly"');
  });

  it("预览展示真实门店、结构化规则和唯一提交入口", () => {
    const page = readFileSync(
      resolve(root, "pages/vouchers/preview.wxml"),
      "utf8",
    );

    expect(page).toContain("{{shopName}}");
    expect(page).toContain("{{shopAddress}}");
    expect(page).toContain("{{validityText}}");
    expect(page).toContain("{{usageRows}}");
    expect(page).toContain("{{draft.detailMedia}}");
    expect(page.match(/bindtap="submit"/g)).toHaveLength(1);
  });

  it("我的页面只通过权限态显示团购券入口", () => {
    const page = readFileSync(resolve(root, "pages/me/index.wxml"), "utf8");
    const guard = readFileSync(
      resolve(root, "utils/merchant-guard.ts"),
      "utf8",
    );

    expect(page).toContain('wx:if="{{canManageVouchers}}"');
    expect(guard).toContain('includes("merchant:voucher:manage")');
  });
});
