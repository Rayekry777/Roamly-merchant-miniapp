import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "../miniprogram/utils/request";

describe("商户请求适配器", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync: vi.fn(),
      request: vi.fn((options) =>
        options.success({
          statusCode: 200,
          data: {
            code: "OK",
            message: "操作成功",
            data: { id: "9007199254740993" },
          },
        }),
      ),
      showToast: vi.fn(),
    });
  });

  it("使用商户 Bearer Token 并保留字符串大 ID", async () => {
    const result = await request<{ id: string }>("/v1/merchant/auth/me");

    expect(result.data?.id).toBe("9007199254740993");
    expect(vi.mocked(wx.request).mock.calls[0]?.[0].header).toEqual({
      Authorization: "Bearer merchant-token",
    });
  });

  it("401 清理商户会话", async () => {
    const removeStorageSync = vi.fn();
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync,
      request: vi.fn((options) =>
        options.success({
          statusCode: 401,
          data: { code: "UNAUTHORIZED", message: "登录已失效" },
        }),
      ),
      showToast: vi.fn(),
    });

    await expect(request("/v1/merchant/auth/me")).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
    expect(removeStorageSync).toHaveBeenCalledWith(
      "roamly_merchant_satoken_v1",
    );
  });

  it("拒绝不符合 Result 契约的成功响应", async () => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync: vi.fn(),
      request: vi.fn((options) =>
        options.success({ statusCode: 200, data: { id: "1" } }),
      ),
      showToast: vi.fn(),
    });

    await expect(
      request("/v1/merchant/auth/me", { showError: false }),
    ).rejects.toMatchObject({ code: "RESPONSE_CONTRACT_INVALID" });
  });
});
