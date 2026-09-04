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
    canOnboard: false,
    onboardingLabel: "",
    canManageVouchers: false,
    canAcceptInvitation: false,
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
        canOnboard:
          current.role === "OWNER" &&
          ["NOT_APPLIED", "PENDING", "REJECTED"].includes(current.status),
        onboardingLabel:
          current.status === "PENDING"
            ? "查看入驻资料"
            : current.status === "REJECTED"
              ? "修改入驻资料"
              : "开始商户入驻",
        canManageVouchers:
          current.status === "ACTIVE" &&
          current.permissions.includes("merchant:voucher:manage"),
        canAcceptInvitation: !current.shop && current.status === "NOT_APPLIED",
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
  openOnboarding() {
    wx.navigateTo({ url: "/pages/onboarding/index" });
  },
  openVouchers() {
    if (!this.data.canManageVouchers) {
      wx.showToast({ title: "当前账号暂不能管理团购券", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/vouchers/index" });
  },
  openStaff() { if (this.data.current?.role !== "OWNER") { wx.showToast({ title: "仅店主管理员工", icon: "none" }); return; } wx.navigateTo({ url: "/pages/staff/index" }); },
  openStaffAcceptance() { wx.navigateTo({ url: "/pages/staff/acceptance" }); },
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
