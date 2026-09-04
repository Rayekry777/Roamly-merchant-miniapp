import { acceptStaffInvitation } from "../../../api/merchant-staff";
import { merchantStore } from "../../../store/merchant";

Page({
  data: { token: "", loading: false, error: "" },
  onLoad(options: Record<string, string>) {
    if (options.token)
      this.setData({ token: decodeURIComponent(options.token) });
  },
  onToken(e: WechatMiniprogram.Input) {
    this.setData({ token: e.detail.value.trim(), error: "" });
  },
  scan() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
      success: ({ result }) => this.setData({ token: result, error: "" }),
      fail: (error) => {
        if (!error.errMsg?.includes("cancel"))
          wx.showToast({ title: "无法使用相机扫码", icon: "none" });
      },
    });
  },
  async accept() {
    if (this.data.token.length < 16)
      return this.setData({ error: "请输入有效的邀请码" });
    this.setData({ loading: true, error: "" });
    try {
      await acceptStaffInvitation(this.data.token);
      await merchantStore.restore(true);
      wx.showToast({ title: "已加入门店", icon: "success" });
      wx.switchTab({ url: "/pages/me/index" });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "接受邀请失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
