import { sendMerchantSmsCode } from "../../api/merchant-auth";
import { merchantStore } from "../../store/merchant";
import type { MerchantSmsCodeScene } from "../../types/merchant-auth";
import { ApiError } from "../../utils/request";
import {
  markLoginPageReady,
  resumeAfterLogin,
} from "../../utils/auth-navigation";

type LoginMode = "SMS" | "REGISTRATION" | "PASSWORD";

Page({
  data: {
    mode: "SMS" as LoginMode,
    phone: "",
    code: "",
    password: "",
    confirmPassword: "",
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
  switchMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode) as LoginMode;
    if (!(["SMS", "REGISTRATION", "PASSWORD"] as LoginMode[]).includes(mode))
      return;
    if (this.timer) clearInterval(this.timer);
    this.setData({
      mode,
      code: "",
      password: "",
      confirmPassword: "",
      countdown: 0,
      error: "",
    });
  },
  onPhone(event: WechatMiniprogram.CustomEvent) {
    this.setData({ phone: this.eventText(event), error: "" });
  },
  onCode(event: WechatMiniprogram.CustomEvent) {
    this.setData({ code: this.eventText(event), error: "" });
  },
  onPassword(event: WechatMiniprogram.CustomEvent) {
    this.setData({ password: this.eventText(event), error: "" });
  },
  onConfirmPassword(event: WechatMiniprogram.CustomEvent) {
    this.setData({ confirmPassword: this.eventText(event), error: "" });
  },
  async sendCode() {
    if (this.data.sending || this.data.countdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: "请输入正确的手机号", icon: "none" });
      return;
    }
    this.setData({ sending: true, error: "" });
    try {
      const scene: MerchantSmsCodeScene =
        this.data.mode === "REGISTRATION" ? "REGISTRATION" : "LOGIN";
      await sendMerchantSmsCode(this.data.phone, scene);
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
    const validation = this.validate();
    if (validation) {
      wx.showToast({ title: validation, icon: "none" });
      return;
    }
    this.setData({ loggingIn: true, error: "" });
    try {
      if (this.data.mode === "REGISTRATION") {
        await merchantStore.register(
          this.data.phone,
          this.data.code,
          this.data.password,
          this.data.confirmPassword,
        );
      } else if (this.data.mode === "PASSWORD") {
        await merchantStore.loginByPassword(
          this.data.phone,
          this.data.password,
        );
      } else {
        await merchantStore.login(this.data.phone, this.data.code);
      }
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
  validate(): string {
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) return "请输入正确的手机号";
    if (this.data.mode !== "PASSWORD" && !/^\d{6}$/.test(this.data.code))
      return "请输入6位验证码";
    if (this.data.mode !== "SMS") {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(this.data.password))
        return "密码需为8–64位，且包含字母和数字";
    }
    if (
      this.data.mode === "REGISTRATION" &&
      this.data.password !== this.data.confirmPassword
    )
      return "两次输入的密码不一致";
    return "";
  },
  beginCountdown(seconds: number) {
    this.setData({ countdown: seconds });
    this.timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      this.setData({ countdown });
      if (countdown <= 0 && this.timer) clearInterval(this.timer);
    }, 1000);
  },
  eventText(event: WechatMiniprogram.CustomEvent): string {
    const detail = event.detail as unknown as string | { value: string };
    return typeof detail === "string" ? detail : detail.value;
  },
  errorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : "操作失败，请稍后重试";
  },
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  redirectTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  redirecting: false,
});
