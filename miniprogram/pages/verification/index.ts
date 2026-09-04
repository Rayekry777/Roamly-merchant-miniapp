import { guardActiveMerchant } from "../../utils/merchant-guard";
import { previewRedemption, confirmRedemption, type RedemptionPreview } from "../../api/redemption";

Page({
  data: { code: "", loading: false, preview: null as RedemptionPreview | null, error: "" },
  onShow() {
    void guardActiveMerchant();
  },
  onCode(e: WechatMiniprogram.Input) { this.setData({ code: e.detail.value }); },
  async scan() { wx.scanCode({ onlyFromCamera: false, success: ({ result }) => { this.setData({ code: result }); void this.preview(); }, fail: () => wx.showToast({ title: "已取消扫码", icon: "none" }) }); },
  async preview() { if (!/^\d{12}$/.test(this.data.code)) return wx.showToast({ title: "请输入12位券码", icon: "none" }); this.setData({ loading: true, error: "" }); try { const r = await previewRedemption(this.data.code); this.setData({ preview: r.data }); } catch (e) { this.setData({ error: e instanceof Error ? e.message : "券码不可用" }); } finally { this.setData({ loading: false }); } },
  async confirm() { if (!this.data.preview) return; this.setData({ loading: true }); try { await confirmRedemption(this.data.preview.previewToken); this.setData({ preview: null, code: "" }); wx.showToast({ title: "核销成功", icon: "success" }); } catch (e) { this.setData({ error: e instanceof Error ? e.message : "核销失败" }); } finally { this.setData({ loading: false }); } },
});
