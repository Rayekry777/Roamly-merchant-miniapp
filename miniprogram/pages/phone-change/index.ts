import {
  changeMerchantPhone,
  sendMerchantPhoneChangeCode,
} from "../../api/merchant-account";
import { merchantStore } from "../../store/merchant";

Page({
  data: {
    currentPassword: "",
    newPhone: "",
    code: "",
    countdown: 0,
    loading: false,
    codeLoading: false,
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },
  onValue(event: WechatMiniprogram.CustomEvent) {
    const field = String(event.currentTarget.dataset.field || "");
    const detail = event.detail as unknown as string | { value: string };
    this.setData({
      [field]: typeof detail === "string" ? detail : detail.value,
    });
  },
  async getCode() {
    if (this.data.codeLoading || this.data.countdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.newPhone)) {
      wx.showToast({ title: "请输入正确的新手机号", icon: "none" });
      return;
    }
    this.setData({ codeLoading: true });
    try {
      await sendMerchantPhoneChangeCode(this.data.newPhone);
      wx.showToast({ title: "验证码已发送", icon: "success" });
      this.startCountdown();
    } finally {
      this.setData({ codeLoading: false });
    }
  },
  async submit() {
    if (this.data.loading) return;
    if (
      !this.data.currentPassword ||
      !/^1[3-9]\d{9}$/.test(this.data.newPhone) ||
      !/^\d{6}$/.test(this.data.code)
    ) {
      wx.showToast({ title: "请完整填写换绑信息", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      await changeMerchantPhone(
        this.data.currentPassword,
        this.data.newPhone,
        this.data.code,
      );
      merchantStore.clear();
      wx.showToast({ title: "换绑成功，请重新登录", icon: "success" });
      wx.reLaunch({ url: "/pages/login/index?entry=phone-change" });
    } finally {
      this.setData({ loading: false });
    }
  },
  startCountdown() {
    this.setData({ countdown: 60 });
    this.timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      this.setData({ countdown });
      if (countdown <= 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  },
  timer: undefined as ReturnType<typeof setInterval> | undefined,
});
