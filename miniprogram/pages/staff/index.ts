import { listStaff, inviteStaff, disableStaff, activateStaff, type MerchantStaff } from "../../api/merchant-staff";

Page({
  data: { staff: [] as MerchantStaff[], loading: true, error: "", phone: "", role: "MANAGER" as "MANAGER" | "VERIFIER", invitationToken: "", invitationVisible: false },
  onShow() { void this.load(); },
  async load() { this.setData({ loading: true }); try { const r = await listStaff(); this.setData({ staff: r.data?.items || [], error: "" }); } catch (e) { this.setData({ error: e instanceof Error ? e.message : "加载失败" }); } finally { this.setData({ loading: false }); } },
  onPhone(e: WechatMiniprogram.Input) { this.setData({ phone: e.detail.value }); },
  onRole(e: WechatMiniprogram.PickerChange) { this.setData({ role: String(e.detail.value) === "0" ? "MANAGER" : "VERIFIER" }); },
  async invite() {
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) return wx.showToast({ title: "请输入正确手机号", icon: "none" });
    try { const r = await inviteStaff(this.data.phone, this.data.role); const token = r.data?.token; if (!token) throw new Error("邀请响应格式异常"); this.setData({ invitationToken: token, invitationVisible: true, phone: "" }); }
    catch (e) { wx.showToast({ title: e instanceof Error ? e.message : "邀请失败", icon: "none" }); }
  },
  closeInvitation() { this.setData({ invitationVisible: false, invitationToken: "" }); },
  noop() {},
  async toggle(e: WechatMiniprogram.TouchEvent) { const id = String(e.currentTarget.dataset.id); const item = this.data.staff.find(v => v.id === id); if (!item) return; try { if (item.status === "ACTIVE") await disableStaff(id); else await activateStaff(id); await this.load(); } catch (err) { wx.showToast({ title: err instanceof Error ? err.message : "操作失败", icon: "none" }); } },
});
