import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmRedemption,
  listMerchantRedemptions,
  previewRedemption,
  reverseRedemption,
} from "../miniprogram/api/redemption";
import {
  getMerchantSettlement,
  listMerchantSettlements,
} from "../miniprogram/api/settlement";
import {
  formatFen,
  settlementStatus,
} from "../miniprogram/utils/format";

const root = resolve(process.cwd(), "miniprogram");

describe("商户端三栏体验与动效", () => {
  it("注册首页、消息、我的三栏及经营子页面", () => {
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")) as {
      pages: string[];
      tabBar: { custom: boolean; list: Array<{ pagePath: string }> };
    };

    expect(app.tabBar.custom).toBe(true);
    expect(app.tabBar.list.map((item) => item.pagePath)).toEqual([
      "pages/workbench/index",
      "pages/messages/index",
      "pages/me/index",
    ]);
    expect(app.pages).toEqual(
      expect.arrayContaining([
        "pages/redemptions/index",
        "pages/operations/index",
        "pages/settlements/index",
        "pages/settlements/detail",
      ]),
    );
  });

  it("首页复刻参考结构并沿用 Roamly 色板", () => {
    const template = readFileSync(
      resolve(root, "pages/workbench/index.wxml"),
      "utf8",
    );
    const styles = readFileSync(
      resolve(root, "pages/workbench/index.wxss"),
      "utf8",
    );

    expect(template).toContain("扫码验券");
    expect(template).toContain("输码验券");
    expect(template).toContain("本店经营资金总计");
    expect(template).toContain("结算记录包含历史批次和冲回调整");
    expect(template).toContain("去管理版");
    expect(styles).toContain("var(--roamly-primary)");
    expect(styles).toContain("var(--roamly-accent)");
  });

  it("视觉检查脚本生成三组参考对比", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const visualScript = readFileSync(
      resolve(process.cwd(), "scripts/visual-check.cjs"),
      "utf8",
    );

    expect(packageJson.scripts["visual:check"]).toBe(
      "node scripts/visual-check.cjs",
    );
    expect(packageJson.devDependencies["miniprogram-automator"]).toBe(
      "^0.12.1",
    );
    expect(visualScript).toContain("home-expanded");
    expect(visualScript).toContain("home-collapsed");
    expect(visualScript).toContain('name: "me"');
    expect(visualScript).toContain("side-by-side");
    expect(visualScript).toContain("overlay");
  });

  it("安装 Lottie 并提供销毁和静态降级", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const component = readFileSync(
      resolve(root, "components/success-motion/index.ts"),
      "utf8",
    );
    const template = readFileSync(
      resolve(root, "components/success-motion/index.wxml"),
      "utf8",
    );

    expect(packageJson.dependencies["lottie-miniprogram"]).toBe("1.0.12");
    expect(component).toContain("activeAnimation?.destroy()");
    expect(component).toContain("motionEnabled: false");
    expect(template).toContain('wx:else class="motion-fallback"');
  });

  it("金额和结算状态使用统一展示规则", () => {
    expect(formatFen(5380)).toBe("53.80");
    expect(settlementStatus("SUCCEEDED")).toEqual({
      text: "已结算",
      tone: "success",
    });
  });
});

describe("核销与结算现有接口封装", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync: vi.fn(),
      showToast: vi.fn(),
      request: vi.fn((options) => {
        const data = options.url.includes("settlements/")
          ? {
              id: "9007199254740993",
              shopId: "1",
              settlementDate: "2026-09-05",
              status: "SUCCEEDED",
              totalAmount: 5380,
            }
          : options.url.includes("settlements") ||
              (options.url.includes("redemptions") && options.method !== "POST")
            ? { items: [], page: 1, size: 20, total: 0 }
            : {
                id: "9007199254740994",
                voucherId: "2",
                shopId: "1",
                operatorId: "3",
                status: "SUCCEEDED",
                useCount: 1,
                remainingUseCount: 0,
                redeemedTime: "2026-09-05T12:00:00",
              };
        options.success?.({
          statusCode: 200,
          data: { code: "OK", message: "操作成功", data },
        });
        return {} as WechatMiniprogram.RequestTask;
      }),
    });
  });

  it("核销确认和撤销保留调用方幂等键", async () => {
    await confirmRedemption("preview-token", "redeem-fixed-key");
    await reverseRedemption("9", "误操作", "reverse-fixed-key");

    const calls = vi.mocked(wx.request).mock.calls;
    expect(calls[0]?.[0].header).toMatchObject({
      "Idempotency-Key": "redeem-fixed-key",
    });
    expect(calls[1]?.[0].header).toMatchObject({
      "Idempotency-Key": "reverse-fixed-key",
    });
  });

  it("核销预览请求只提交券码", async () => {
    await previewRedemption("123456789012");
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].data).toEqual({
      code: "123456789012",
    });
  });

  it("核销和结算只调用现有商户接口", async () => {
    await listMerchantRedemptions();
    await listMerchantSettlements();
    await getMerchantSettlement("9007199254740993");

    expect(
      vi.mocked(wx.request).mock.calls.map(([options]) => options.url),
    ).toEqual([
      "http://127.0.0.1:8081/v1/merchant/redemptions?page=1&size=20",
      "http://127.0.0.1:8081/v1/merchant/settlements?page=1&size=20",
      "http://127.0.0.1:8081/v1/merchant/settlements/9007199254740993",
    ]);
  });
});
