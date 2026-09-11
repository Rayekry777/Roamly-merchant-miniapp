import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  changeMerchantPassword,
  changeMerchantPhone,
  getMerchantAccountProfile,
  parseProfile,
} from "../miniprogram/api/merchant-account";

const profile = {
  id: "9007199254740993",
  nickname: "茶餐厅租户",
  phone: "13900000001",
  avatarContentPath: "/v1/merchant/business-media/11/content",
  role: "TENANT",
  roleLabel: "租户",
  status: "ACTIVE",
  statusLabel: "已激活",
  shop: { id: "9007199254740995", name: "103 茶餐厅", address: "金华路 29 号" },
};

describe("商户个人信息契约", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync: vi.fn(),
      showToast: vi.fn(),
      request: vi.fn(),
    });
  });

  it("解析完整手机号、私有头像路径和只读归属信息", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: { code: "OK", message: "操作成功", data: profile },
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: "request:ok",
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    const result = await getMerchantAccountProfile();

    expect(result.phone).toBe("13900000001");
    expect(result.avatarContentPath).toContain("/content");
    expect(result.shop?.name).toBe("103 茶餐厅");
  });

  it("拒绝缺少归属字段的个人信息响应", () => {
    expect(() => parseProfile({ ...profile, roleLabel: "" })).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
  });

  it("手机号与密码修改调用安全接口", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 204,
        data: undefined,
        header: {},
        cookies: [],
        profile: {} as WechatMiniprogram.RequestProfile,
        errMsg: "request:ok",
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    await changeMerchantPhone("Roamly123", "13800000001", "123456");
    await changeMerchantPassword(
      "Roamly123",
      "Roamly456",
      "Roamly456",
      "123456",
    );

    expect(vi.mocked(wx.request).mock.calls[0]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/merchant/account/phone",
      method: "PUT",
    });
    expect(vi.mocked(wx.request).mock.calls[1]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/merchant/account/password",
      method: "PUT",
    });
  });
});
