import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumePendingAction,
  markLoginPageReady,
  resumeAfterLogin,
  routeToLogin,
} from "../miniprogram/utils/auth-navigation";
import { merchantStore } from "../miniprogram/store/merchant";
import {
  guardActiveMerchant,
  guardMerchantPermission,
} from "../miniprogram/utils/merchant-guard";
import type { CurrentMerchant } from "../miniprogram/types/merchant-auth";

const activeMerchant: CurrentMerchant = {
  id: "1",
  maskedPhone: "139****0001",
  nickname: "Roamly 店主",
  role: "OWNER",
  roleLabel: "店主",
  status: "ACTIVE",
  statusLabel: "已激活",
  shop: { id: "1", name: "Roamly 门店", address: "测试地址" },
  permissions: ["merchant:finance:read"],
};

describe("商户登录导航与账号状态守卫", () => {
  let storage: Record<string, unknown>;

  beforeEach(() => {
    storage = { roamly_merchant_satoken_v1: "merchant-token" };
    vi.stubGlobal("getCurrentPages", () => [
      { route: "pages/messages/index", options: {} },
    ]);
    vi.stubGlobal("wx", {
      getStorageSync: vi.fn((key: string) => storage[key]),
      setStorageSync: vi.fn((key: string, value: unknown) => {
        storage[key] = value;
      }),
      removeStorageSync: vi.fn((key: string) => {
        delete storage[key];
      }),
      navigateTo: vi.fn(),
      redirectTo: vi.fn(),
      reLaunch: vi.fn(),
      switchTab: vi.fn(),
      showToast: vi.fn(),
      showModal: vi.fn(),
    });
    markLoginPageReady();
    merchantStore.current = activeMerchant;
    merchantStore.initialized = true;
    merchantStore.authState = "authenticated";
  });

  it("并发受保护入口只打开一次登录并保存原动作", () => {
    delete storage.roamly_merchant_satoken_v1;
    const intent = { route: "/pages/workbench/index", action: "scan" };

    routeToLogin(intent);
    routeToLogin(intent);

    expect(wx.navigateTo).toHaveBeenCalledTimes(1);
    expect(storage.roamly_merchant_auth_intent_v1).toMatchObject(intent);
  });

  it("登录后返回原 Tab 并只消费一次待执行动作", () => {
    routeToLogin({ route: "/pages/workbench/index", action: "scan" });
    markLoginPageReady();

    resumeAfterLogin();

    expect(wx.switchTab).toHaveBeenCalledWith({
      url: "/pages/workbench/index",
    });
    expect(consumePendingAction("/pages/workbench/index")).toBe("scan");
    expect(consumePendingAction("/pages/workbench/index")).toBe("");
  });

  it("非激活账号只展示状态弹层，不主动切换 Tab", async () => {
    const inactive = {
      ...activeMerchant,
      status: "PENDING" as const,
      statusLabel: "审核中",
    };
    vi.spyOn(merchantStore, "restore").mockResolvedValueOnce(inactive);
    merchantStore.current = inactive;

    await expect(guardActiveMerchant()).resolves.toBe(false);

    expect(wx.showModal).toHaveBeenCalled();
    expect(wx.switchTab).not.toHaveBeenCalled();
  });

  it("已激活但无权限时留在原页面", async () => {
    vi.spyOn(merchantStore, "restore").mockResolvedValueOnce(activeMerchant);
    merchantStore.current = activeMerchant;

    await expect(
      guardMerchantPermission("merchant:staff:manage", "无员工权限"),
    ).resolves.toBe(false);

    expect(wx.showToast).toHaveBeenCalledWith({
      title: "无员工权限",
      icon: "none",
    });
    expect(wx.switchTab).not.toHaveBeenCalled();
  });
});
