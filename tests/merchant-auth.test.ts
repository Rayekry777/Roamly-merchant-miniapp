import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentMerchant,
  loginMerchant,
  parseCurrentMerchant,
  sendMerchantSmsCode,
} from "../miniprogram/api/merchant-auth";
import { merchantAccountStatuses } from "../miniprogram/types/merchant-auth";

const activeMerchant = {
  id: "9007199254740993",
  maskedPhone: "139****0001",
  nickname: "茶餐厅店主",
  role: "OWNER",
  roleLabel: "店主",
  status: "ACTIVE",
  statusLabel: "已激活",
  shop: { id: "9007199254740995", name: "103 茶餐厅", address: "金华路 29 号" },
  permissions: ["merchant:profile:read", "merchant:shop:manage"],
};

describe("阶段 17 商户认证契约", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn(),
      showToast: vi.fn(),
      request: vi.fn(),
    });
  });

  it("使用公开商户登录接口并保留字符串令牌字段", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: {
          code: "OK",
          message: "操作成功",
          data: {
            tokenType: "Bearer",
            accessToken: "merchant-access-token",
            expiresIn: 2592000,
          },
        },
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: "request:ok",
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    const token = await loginMerchant("13900000001", "123456");

    expect(token.accessToken).toBe("merchant-access-token");
    expect(vi.mocked(wx.request).mock.calls[0]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/merchant/auth/login",
      method: "POST",
      header: {},
      data: { phone: "13900000001", code: "123456" },
    });
  });

  it("解析当前身份、真实门店与大字符串 ID", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: { code: "OK", message: "操作成功", data: activeMerchant },
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: "request:ok",
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    const current = await getCurrentMerchant();

    expect(current.id).toBe("9007199254740993");
    expect(current.shop?.id).toBe("9007199254740995");
    expect(current.statusLabel).toBe("已激活");
  });

  it.each(merchantAccountStatuses)("接受服务端状态 %s 的中文映射", (status) => {
    const current = parseCurrentMerchant({
      ...activeMerchant,
      status,
      statusLabel: `状态-${status}`,
      shop: status === "ACTIVE" ? activeMerchant.shop : undefined,
    });
    expect(current.status).toBe(status);
  });

  it("身份字段或门店摘要缺失时报告响应契约异常", () => {
    expect(() =>
      parseCurrentMerchant({ ...activeMerchant, status: "UNKNOWN" }),
    ).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
    expect(() =>
      parseCurrentMerchant({
        ...activeMerchant,
        shop: { id: "1", name: "缺少地址" },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
  });

  it("保留短信 429 的等待文案", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 429,
        data: {
          code: "SMS_SEND_TOO_FREQUENT",
          message: "请42秒后再获取验证码",
        },
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: "request:ok",
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    await expect(sendMerchantSmsCode("13900000001")).rejects.toMatchObject({
      statusCode: 429,
      code: "SMS_SEND_TOO_FREQUENT",
      message: "请42秒后再获取验证码",
    });
  });
});
