import { merchantStore } from "../../store/merchant";
import { downloadMerchantAvatar } from "../../api/merchant-account";
import { voucherDraftStore } from "../../store/voucher-draft";
import type { CurrentMerchant } from "../../types/merchant-auth";
import { routeToLogin } from "../../utils/auth-navigation";
import { merchantProfileView } from "../../utils/merchant-view";
import { ApiError } from "../../utils/request";
import { syncMerchantTabBar } from "../../utils/routes";

Page({
  data: {
    statusBarHeight: 24,
    loading: true,
    current: null as CurrentMerchant | null,
    loggedIn: false,
    accountPanelVisible: false,
    guidance: "",
    statusTone: "neutral",
    avatarText: "R",
    avatarLocalPath: "",
    displayName: "Roamly 商户",
    error: "",
    canOnboard: false,
    onboardingLabel: "",
    canAcceptInvitation: false,
  },
  onLoad() {
    this.setData({ statusBarHeight: wx.getWindowInfo().statusBarHeight || 24 });
  },
  onShow() {
    syncMerchantTabBar(this);
    void this.loadCurrent(false);
  },
  onPullDownRefresh() {
    void this.loadCurrent(true).finally(() => wx.stopPullDownRefresh());
  },
  async loadCurrent(force: boolean) {
    this.setData({ loading: true, error: "" });
    try {
      const current = await merchantStore.restore(force);
      if (!current) {
        this.setData({
          current: null,
          loggedIn: false,
          avatarLocalPath: "",
        });
        return;
      }
      const view = merchantProfileView(current);
      this.setData({
        current,
        loggedIn: true,
        guidance: view.guidance,
        statusTone: view.tone,
        avatarText: view.avatarText,
        displayName: current.shop?.name || current.nickname || "Roamly 商户",
        avatarLocalPath: "",
        canOnboard:
          current.role === "VISITOR" &&
          ["NOT_APPLIED", "PENDING", "REJECTED"].includes(current.status),
        onboardingLabel:
          current.status === "PENDING"
            ? "查看入驻资料"
            : current.status === "REJECTED"
              ? "修改入驻资料"
              : "开始商户入驻",
        canAcceptInvitation: current.canAcceptStaffInvitation,
      });
      if (current.avatarContentPath) {
        void this.loadAvatar(current.id, current.avatarContentPath);
      }
    } catch (error) {
      this.setData({
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
    routeToLogin({ route: "/pages/me/index" });
  },
  openAccountPanel() {
    if (!this.data.loggedIn) {
      this.openLogin();
      return;
    }
    this.setData({ accountPanelVisible: true });
  },
  closeAccountPanel() {
    this.setData({ accountPanelVisible: false });
  },
  noop() {},
  openOnboarding() {
    this.closeAccountPanel();
    wx.navigateTo({ url: "/pages/onboarding/index" });
  },
  openStaffAcceptance() {
    this.closeAccountPanel();
    wx.navigateTo({ url: "/pages/staff/acceptance/index" });
  },
  openManagement() {
    this.closeAccountPanel();
    wx.navigateTo({ url: "/pages/operations/index" });
  },
  openAccount() {
    this.closeAccountPanel();
    wx.navigateTo({ url: "/pages/account/index" });
  },
  async loadAvatar(accountId: string, contentPath: string) {
    try {
      const avatarLocalPath = await downloadMerchantAvatar(contentPath);
      if (this.data.current?.id === accountId)
        this.setData({ avatarLocalPath });
    } catch {
      /* 头像加载失败时保留昵称首字回退，不影响账号信息。 */
    }
  },
  unavailable(event: WechatMiniprogram.TouchEvent) {
    const label = String(event.currentTarget.dataset.label || "该功能");
    wx.showToast({ title: `${label}暂未开放`, icon: "none" });
  },
  openPrivacy() {
    wx.openSetting({
      fail: () => wx.showToast({ title: "暂时无法打开微信设置", icon: "none" }),
    });
  },
  showAbout() {
    wx.showModal({
      title: "关于 Roamly",
      content: "Roamly 商户端\n让门店经营与旅行消费连接得更轻松。",
      showCancel: false,
      confirmText: "知道了",
      confirmColor: "#ff5f57",
    });
  },
  async clearCache() {
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: "清除缓存",
        content: "将清除团购券草稿和临时业务缓存，不会退出登录。",
        confirmText: "清除",
        confirmColor: "#ff5f57",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    voucherDraftStore.clear();
    wx.showToast({ title: "缓存已清除", icon: "success" });
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
    this.closeAccountPanel();
    wx.reLaunch({ url: "/pages/login/index?entry=logout" });
  },
});
