import {
  previewRedemption,
  previewRedemptionByQrToken,
  confirmRedemption,
  type RedemptionPreview,
} from "../../api/redemption";
import { formatDateTime, formatFen, yuanToFen } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";

type RedemptionPreviewView = RedemptionPreview & {
  consumptionAmountText: string;
  discountAmountText: string;
  expiresAtText: string;
};

Page({
  data: {
    code: "",
    consumptionYuan: "",
    loading: false,
    preview: null as RedemptionPreviewView | null,
    error: "",
    success: false,
    manualFocus: false,
  },
  onLoad(options) {
    this.pendingToken = String(options.token || "");
    this.setData({ manualFocus: options.mode === "manual" });
  },
  onShow() {
    void this.activate();
  },
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:redemption:manage",
        "当前角色无权核销",
        {
          route: "/pages/verification/index",
          query: {
            ...(this.pendingToken ? { token: this.pendingToken } : {}),
            ...(this.data.manualFocus ? { mode: "manual" } : {}),
          },
        },
      ))
    )
      return;
    if (this.pendingToken) {
      const token = this.pendingToken;
      this.pendingToken = "";
      void this.previewQr(token);
    }
    this.stopRealtime?.();
    this.stopRealtime = connectMerchantRealtime((event) => {
      if (
        event.type === "VOUCHER_REDEEMED" ||
        event.type === "REDEMPTION_REVERSED"
      ) {
        this.setData({ preview: null, error: "核销状态已更新，请重新预览" });
      }
    });
  },
  onHide() {
    this.stopRealtime?.();
    this.stopRealtime = undefined;
  },
  onCode(e: WechatMiniprogram.Input) {
    this.setData({ code: e.detail.value.replace(/\D/g, "").slice(0, 12) });
  },
  onConsumption(e: WechatMiniprogram.Input) {
    this.setData({ consumptionYuan: e.detail.value.trim() });
  },
  async scan() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
      success: ({ result }) => {
        void this.previewQr(result);
      },
      fail: (error) => {
        if (!error.errMsg?.includes("cancel"))
          wx.showToast({ title: "无法使用相机扫码", icon: "none" });
      },
    });
  },
  async previewQr(token: string) {
    this.setData({ loading: true, error: "", preview: null });
    try {
      const r = await previewRedemptionByQrToken(token);
      if (!r.data) throw new Error("二维码预览响应格式异常");
      this.applyPreview(r.data);
    } catch (e) {
      this.setData({ error: e instanceof Error ? e.message : "二维码不可用" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async previewCode() {
    if (!/^\d{12}$/.test(this.data.code))
      return wx.showToast({ title: "请输入12位券码或扫码", icon: "none" });
    let consumptionAmount = 0;
    try {
      consumptionAmount = yuanToFen(this.data.consumptionYuan);
    } catch (error) {
      return wx.showToast({
        title: error instanceof Error ? error.message : "消费金额格式错误",
        icon: "none",
      });
    }
    this.setData({ loading: true, error: "", preview: null });
    try {
      const r = await previewRedemption(this.data.code, consumptionAmount);
      if (!r.data) throw new Error("券码预览响应格式异常");
      this.applyPreview(r.data);
    } catch (e) {
      this.setData({ error: e instanceof Error ? e.message : "券码不可用" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async confirm() {
    if (!this.data.preview) return;
    if (Date.parse(this.data.preview.expiresAt) <= Date.now()) {
      this.setData({ preview: null, error: "核销预览已过期，请重新预览" });
      return;
    }
    this.setData({ loading: true });
    try {
      if (!this.confirmKey) {
        this.confirmKey = `redeem-${this.data.preview.voucherId}-${Date.now()}`;
      }
      await confirmRedemption(this.data.preview.previewToken, this.confirmKey);
      this.setData({
        preview: null,
        code: "",
        consumptionYuan: "",
        success: true,
        error: "",
      });
      this.selectComponent("#success-motion")?.show();
    } catch (e) {
      this.setData({ error: e instanceof Error ? e.message : "核销失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  applyPreview(value: RedemptionPreview) {
    this.confirmKey = "";
    this.setData({
      preview: {
        ...value,
        consumptionAmountText: formatFen(value.consumptionAmount),
        discountAmountText: formatFen(value.discountAmount),
        expiresAtText: formatDateTime(value.expiresAt),
      },
      success: false,
      error: "",
    });
  },
  continueRedemption() {
    this.confirmKey = "";
    this.setData({ success: false, manualFocus: true });
  },
  openRecords() {
    wx.redirectTo({ url: "/pages/redemptions/index" });
  },
  stopRealtime: undefined as (() => void) | undefined,
  pendingToken: "",
  confirmKey: "",
});
