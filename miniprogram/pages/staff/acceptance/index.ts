import { acceptStaffInvitation } from "../../../api/merchant-staff";
import { merchantStore } from "../../../store/merchant";

Page({
  data: { credentialCode: "", loading: false, error: "" },
  onLoad(options: Record<string, string>) {
    if (/^\d{6}$/.test(options.code || ""))
      this.setData({ credentialCode: options.code });
  },
  onCredentialCode(e: WechatMiniprogram.Input) {
    this.setData({
      credentialCode: e.detail.value.replace(/\D/g, "").slice(0, 6),
      error: "",
    });
  },
  async accept() {
    if (!/^\d{6}$/.test(this.data.credentialCode))
      return this.setData({ error: "请输入六位数字邀请凭证" });
    this.setData({ loading: true, error: "" });
    try {
      await acceptStaffInvitation(this.data.credentialCode);
      await merchantStore.restore(true);
      this.selectComponent("#success-motion")?.show();
      setTimeout(() => wx.switchTab({ url: "/pages/me/index" }), 1500);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "接受邀请失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
