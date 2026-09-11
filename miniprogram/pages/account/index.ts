import {
  downloadMerchantAvatar,
  getMerchantAccountProfile,
  replaceMerchantAvatar,
  updateMerchantNickname,
} from "../../api/merchant-account";
import { merchantStore } from "../../store/merchant";
import type { MerchantAccountProfile } from "../../types/merchant-auth";
import { cropAvatarImage } from "../../utils/image";

Page({
  data: {
    profile: null as MerchantAccountProfile | null,
    nickname: "",
    avatarText: "R",
    avatarLocalPath: "",
    loading: true,
    savingNickname: false,
    savingAvatar: false,
    loggingOut: false,
  },
  onLoad() {
    void this.load();
  },
  async load() {
    this.setData({ loading: true });
    try {
      const profile = await getMerchantAccountProfile();
      this.applyProfile(profile);
      if (profile.avatarContentPath)
        void this.loadAvatar(profile.avatarContentPath);
    } finally {
      this.setData({ loading: false });
    }
  },
  onNickname(event: WechatMiniprogram.CustomEvent) {
    this.setData({ nickname: this.eventText(event) });
  },
  async saveNickname() {
    if (this.data.savingNickname || !this.data.profile) return;
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2 || nickname.length > 64) {
      wx.showToast({ title: "昵称长度需为2–64个字符", icon: "none" });
      return;
    }
    if (nickname === this.data.profile.nickname) {
      wx.showToast({ title: "新昵称不能与当前昵称相同", icon: "none" });
      return;
    }
    this.setData({ savingNickname: true });
    try {
      const profile = await updateMerchantNickname(nickname);
      this.applyProfile(profile);
      wx.showToast({ title: "昵称已更新", icon: "success" });
    } finally {
      this.setData({ savingNickname: false });
    }
  },
  chooseAvatar() {
    if (this.data.savingAvatar || this.data.loggingOut) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const filePath = result.tempFiles[0]?.tempFilePath;
        if (filePath) void this.editAndSaveAvatar(filePath);
      },
    });
  },
  async editAndSaveAvatar(filePath: string) {
    try {
      const croppedPath = await cropAvatarImage(filePath);
      await this.saveAvatar(croppedPath);
    } catch (error) {
      if (!isCanceled(error)) {
        wx.showToast({ title: "头像编辑失败，请重试", icon: "none" });
      }
    }
  },
  async saveAvatar(filePath: string) {
    this.setData({ savingAvatar: true });
    try {
      const profile = await replaceMerchantAvatar(filePath);
      this.applyProfile(profile);
      // 上传完成后重新用带 Bearer 鉴权的私有地址下载，避免依赖已过期的选择器临时路径。
      this.setData({ avatarLocalPath: "" });
      if (profile.avatarContentPath) {
        await this.loadAvatar(profile.avatarContentPath);
      }
      // 私有文件读取失败时仍保留本次选择的临时预览，避免“已保存但无图”。
      if (!this.data.avatarLocalPath) this.setData({ avatarLocalPath: filePath });
      wx.showToast({ title: "头像已更新", icon: "success" });
    } finally {
      this.setData({ savingAvatar: false });
    }
  },
  openPhoneChange() {
    if (this.data.loggingOut) return;
    wx.navigateTo({ url: "/pages/phone-change/index" });
  },
  openPasswordChange() {
    if (this.data.loggingOut) return;
    wx.navigateTo({ url: "/pages/password-change/index" });
  },
  async logout() {
    if (this.data.loggingOut) return;
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
    this.setData({ loggingOut: true });
    try {
      await merchantStore.logout();
    } catch {
      /* logout 会在 finally 中清理本地会话，服务端失败不阻断退出。 */
    }
    wx.reLaunch({
      url: "/pages/login/index?entry=logout",
      fail: () => this.setData({ loggingOut: false }),
    });
  },
  async loadAvatar(contentPath: string) {
    try {
      const avatarLocalPath = await downloadMerchantAvatar(contentPath);
      if (this.data.profile?.avatarContentPath === contentPath) {
        this.setData({ avatarLocalPath });
      }
    } catch {
      /* 私有头像读取失败时展示昵称首字，不阻断资料维护。 */
    }
  },
  applyProfile(profile: MerchantAccountProfile) {
    merchantStore.applyProfile(profile);
    this.setData({
      profile,
      nickname: profile.nickname,
      avatarText: profile.nickname.trim().slice(0, 1) || "R",
    });
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
});

function isCanceled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error &&
      "errMsg" in error &&
      String((error as { errMsg: string }).errMsg).includes("cancel"),
  );
}
