import { sendMerchantSmsCode } from "../../api/merchant-auth";
import { merchantStore } from "../../store/merchant";
import { ApiError } from "../../utils/request";
import {
  markLoginPageReady,
  resumeAfterLogin,
} from "../../utils/auth-navigation";

Page({
  data: {
    phone: "",
    code: "",
    countdown: 0,
    sending: false,
    loggingIn: false,
    error: "",
    showBack: true,
  },
  onLoad(options: Record<string, string>) {
    this.setData({ showBack: options.entry === "protected" });
  },
  onShow() {
    markLoginPageReady();
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  },
  onPhone(event: WechatMiniprogram.CustomEvent) {
    this.setData({ phone: this.eventText(event), error: "" });
  },
  onCode(event: WechatMiniprogram.CustomEvent) {
    this.setData({ code: this.eventText(event), error: "" });
  },
  async sendCode() {
    if (this.data.sending || this.data.countdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: "请输入正确的手机号", icon: "none" });
      return;
    }
    this.setData({ sending: true, error: "" });
    try {
      await sendMerchantSmsCode(this.data.phone);
      this.beginCountdown(60);
      wx.showToast({ title: "验证码已发送", icon: "success" });
    } catch (error) {
      const message = this.errorMessage(error);
      this.setData({ error: message });
      wx.showToast({ title: message, icon: "none" });
    } finally {
      this.setData({ sending: false });
    }
  },
  async submit() {
    if (this.data.loggingIn || this.redirecting) return;
    if (
      !/^1[3-9]\d{9}$/.test(this.data.phone) ||
      !/^\d{6}$/.test(this.data.code)
    ) {
      wx.showToast({
        title: "请填写正确的手机号和验证码",
        icon: "none",
      });
      return;
    }
    this.setData({ loggingIn: true, error: "" });
    try {
      await merchantStore.login(this.data.phone, this.data.code);
      this.selectComponent("#login-motion")?.show(1000);
      this.redirecting = true;
      this.redirectTimer = setTimeout(() => resumeAfterLogin(), 700);
    } catch (error) {
      const message = this.errorMessage(error);
      this.setData({ error: message });
      wx.showToast({ title: message, icon: "none" });
    } finally {
      if (!this.redirecting) this.setData({ loggingIn: false });
    }
  },
  beginCountdown(seconds: number) {
    if (this.timer) clearInterval(this.timer);
    this.setData({ countdown: seconds });
    this.timer = setInterval(() => {
      const countdown = Math.max(0, this.data.countdown - 1);
      this.setData({ countdown });
      if (countdown === 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
  errorMessage(error: unknown): string {
    return error instanceof ApiError
      ? error.message
      : "服务暂时不可用，请稍后重试";
  },
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  redirectTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  redirecting: false,
});
