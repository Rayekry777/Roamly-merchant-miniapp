import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("阶段 41 商户客服与退款体验", () => {
  it("注册客服会话和售后详情页面", () => {
    const app = JSON.parse(readFileSync("miniprogram/app.json", "utf8")) as {
      pages: string[];
    };
    expect(app.pages).toEqual(
      expect.arrayContaining([
        "pages/customer-service/create",
        "pages/customer-service/detail",
        "pages/after-sales/detail",
      ]),
    );
  });

  it("消息页只展示当前账号工单并提供未读提醒", () => {
    const api = readFileSync("miniprogram/api/customer-service.ts", "utf8");
    const page = readFileSync("miniprogram/pages/messages/index.wxml", "utf8");
    expect(api).toContain("/v1/merchant/customer-service/tickets");
    expect(page).toContain("只展示当前商户账号主动创建的工单");
    expect(page).toContain("条新消息");
  });

  it("退款详情展示审核、Mock 执行、逐券和时间线", () => {
    const page = readFileSync(
      "miniprogram/pages/after-sales/detail.wxml",
      "utf8",
    );
    expect(page).toContain("审核结果");
    expect(page).toContain("Mock 执行状态");
    expect(page).toContain("逐券退款");
    expect(page).toContain("处理时间线");
    expect(page).toContain("联系平台客服");
  });

  it("客服主题输入框使用固定行高避免文字被裁切", () => {
    const styles = readFileSync(
      "miniprogram/pages/customer-service/create.wxss",
      "utf8",
    );
    expect(styles).toMatch(
      /\.field input,\s*\.picker \{[\s\S]*height: 80rpx;[\s\S]*padding: 0;[\s\S]*line-height: 80rpx;/,
    );
    expect(styles).toMatch(
      /\.field textarea \{[\s\S]*height: 220rpx;[\s\S]*padding: 22rpx 0;/,
    );
  });
});
