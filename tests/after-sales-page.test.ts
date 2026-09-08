import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAfterSale,
  listAfterSales,
} from "../miniprogram/api/after-sales";

const root = resolve(process.cwd(), "miniprogram");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("商户售后页面视觉与业务契约", () => {
  it("列表按参考结构包含搜索、四页签和空状态", () => {
    const template = read("pages/after-sales/index.wxml");
    expect(template).toContain("navbar-search");
    expect(template).toContain("stage-tabs");
    expect(template).toContain("暂无相关数据");
    expect(template).toContain("退款单号、订单号或券码");
  });

  it("发起页包含候选选择和帮助说明", () => {
    const template = read("pages/after-sales/create.wxml");
    expect(template).toContain(
      "仅可对已支付且包含可退款未使用券的本店订单发起退款",
    );
    expect(template).toContain("voucher-option");
    expect(template).toContain("help-sheet");
    expect(read("pages/after-sales/create.ts")).toContain(
      'reasonCode: "SHOP_EXCEPTION"',
    );
  });
});

describe("商户售后接口参数", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      request: vi.fn((options) => {
        options.success?.({
          statusCode: 200,
          data: {
            code: "OK",
            message: "操作成功",
            data: { items: [], page: 1, size: 20, total: 0 },
          },
        });
        return {} as WechatMiniprogram.RequestTask;
      }),
    });
  });

  it("列表传递 stage、关键词且不转换 ID", async () => {
    await listAfterSales({ stage: "PENDING", keyword: "9007199254740993" });
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toContain(
      "stage=PENDING",
    );
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].url).toContain(
      "9007199254740993",
    );
  });

  it("退款创建保留字符串订单和券 ID", async () => {
    await createAfterSale(
      {
        orderId: "9007199254740993",
        voucherIds: ["9007199254740994"],
        reasonCode: "SHOP_EXCEPTION",
      },
      "merchant-key-1",
    );
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].data).toEqual({
      orderId: "9007199254740993",
      voucherIds: ["9007199254740994"],
      reasonCode: "SHOP_EXCEPTION",
    });
  });
});
