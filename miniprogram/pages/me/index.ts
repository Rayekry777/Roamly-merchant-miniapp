import type { CurrentMerchant } from "../../types/merchant-auth";
import { merchantStore } from "../../store/merchant";
import { merchantProfileView } from "../../utils/merchant-view";
import { ApiError } from "../../utils/request";

Page({
  data: {
    loading: true,
    current: null as CurrentMerchant | null,
    loggedIn: false,
    guidance: "",
    statusTone: "neutral",
    canOperate: false,
    avatarText: "商",
    error: "",
  },
  onShow() {
    void this.loadCurrent();
  },
  async loadCurrent() {
    this.setData({ loading: true, error: "" });
    try {
      const current = await merchantStore.restore(true);
      if (!current) {
        this.setData({ current: null, loggedIn: false });
        return;
      }
      const view = merchantProfileView(current);
      this.setData({
        current,
        loggedIn: true,
        guidance: view.guidance,
        statusTone: view.tone,
        canOperate: view.canOperate,
        avatarText: view.avatarText,
      });
    } catch (error) {
      this.setData({
        current: null,
        loggedIn: false,
        error:
          error instanceof ApiError
            ? error.message
            : "商户身份加载失败，请稍后重试",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  openLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },
  async logout() {
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: "退出登录",
        content: "退出后需要重新验证手机号。",
        confirmText: "退出",
        confirmColor: "#ff5f57",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    await merchantStore.logout();
    this.setData({ current: null, loggedIn: false, error: "" });
    wx.showToast({ title: "已退出登录", icon: "none" });
  },
});
