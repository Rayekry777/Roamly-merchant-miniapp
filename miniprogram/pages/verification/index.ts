import { guardActiveMerchant } from "../../utils/merchant-guard";
import { previewRedemption, previewRedemptionByQrToken, confirmRedemption, type RedemptionPreview } from "../../api/redemption";
import { connectMerchantRealtime } from "../../utils/realtime";

Page({
  data: { code: "", loading: false, preview: null as RedemptionPreview | null, error: "" },
  onShow() {
    void guardActiveMerchant();
    this.stopRealtime = connectMerchantRealtime((event) => {
      if (event.type === "VOUCHER_REDEEMED" || event.type === "REDEMPTION_REVERSED") {
        this.setData({ preview: null });
      }
    });
  },
  onHide() {
    this.stopRealtime?.();
    this.stopRealtime = undefined;
  },
  onCode(e: WechatMiniprogram.Input) { this.setData({ code: e.detail.value.trim() }); },
  async scan() {
    wx.scanCode({ onlyFromCamera: true, scanType: ["qrCode"], success: ({ result }) => { this.setData({ code: result }); void this.previewQr(result); }, fail: (error) => { if (!error.errMsg?.includes("cancel")) wx.showToast({ title: "无法使用相机扫码", icon: "none" }); } });
  },
  async previewQr(token: string) {
    this.setData({ loading: true, error: "", preview: null });
    try { const r = await previewRedemptionByQrToken(token); this.setData({ preview: r.data }); }
    catch (e) { this.setData({ error: e instanceof Error ? e.message : "二维码不可用" }); }
    finally { this.setData({ loading: false }); }
  },
  async preview() {
    if (!/^\d{12}$/.test(this.data.code)) return wx.showToast({ title: "请输入12位券码或扫码", icon: "none" });
    this.setData({ loading: true, error: "", preview: null });
    try { const r = await previewRedemption(this.data.code); this.setData({ preview: r.data }); }
    catch (e) { this.setData({ error: e instanceof Error ? e.message : "券码不可用" }); }
    finally { this.setData({ loading: false }); }
  },
  async confirm() { if (!this.data.preview) return; this.setData({ loading: true }); try { await confirmRedemption(this.data.preview.previewToken); this.setData({ preview: null, code: "" }); wx.showToast({ title: "核销成功", icon: "success" }); } catch (e) { this.setData({ error: e instanceof Error ? e.message : "核销失败" }); } finally { this.setData({ loading: false }); } },
  stopRealtime: undefined as (() => void) | undefined,
});
