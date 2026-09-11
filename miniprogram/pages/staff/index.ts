import {
  activateStaff,
  disableStaff,
  inviteStaff,
  listStaff,
  revokeStaffInvitation,
  type MerchantStaff,
} from "../../api/merchant-staff";
import { guardMerchantPermission } from "../../utils/merchant-guard";

Page({
  data: {
    staff: [] as MerchantStaff[],
    loading: true,
    inviting: false,
    revoking: false,
    error: "",
    phone: "",
    role: "MANAGER" as "MANAGER" | "VERIFIER",
    invitationId: "",
    credentialCode: "",
    credentialCountdown: 0,
    credentialExpireAt: 0,
  },
  onShow() {
    void this.activate();
    this.startCredentialCountdown();
  },
  onHide() {
    this.stopCredentialCountdown();
  },
  onUnload() {
    this.stopCredentialCountdown();
  },
  async activate() {
    if (
      await guardMerchantPermission(
        "merchant:staff:manage",
        "只有租户可以管理员工",
        { route: "/pages/staff/index" },
      )
    ) {
      await this.load();
    }
  },
  async load() {
    this.setData({ loading: true });
    try {
      const result = await listStaff();
      this.setData({ staff: result.data?.items || [], error: "" });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  onPhone(event: WechatMiniprogram.Input) {
    this.setData({
      phone: event.detail.value.replace(/\D/g, "").slice(0, 11),
    });
  },
  onRole(event: WechatMiniprogram.PickerChange) {
    this.setData({
      role: String(event.detail.value) === "0" ? "MANAGER" : "VERIFIER",
    });
  },
  async invite() {
    if (this.data.inviting || this.data.credentialCountdown > 0) return;
    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({ title: "请输入正确手机号", icon: "none" });
      return;
    }
    this.setData({ inviting: true });
    try {
      const result = await inviteStaff(this.data.phone, this.data.role);
      const invitation = result.data;
      if (
        !invitation ||
        !/^\d{6}$/.test(invitation.credentialCode || "") ||
        invitation.remainingSeconds <= 0
      ) {
        throw new Error("邀请响应格式异常");
      }
      this.setData({
        invitationId: invitation.id,
        credentialCode: invitation.credentialCode,
        credentialCountdown: Math.min(60, invitation.remainingSeconds),
        credentialExpireAt:
          Date.now() + Math.min(60, invitation.remainingSeconds) * 1000,
        phone: "",
      });
      this.startCredentialCountdown();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "邀请失败",
        icon: "none",
      });
    } finally {
      this.setData({ inviting: false });
    }
  },
  copyCredential() {
    if (!this.data.credentialCode || this.data.credentialCountdown <= 0) return;
    wx.setClipboardData({ data: this.data.credentialCode });
  },
  async revokeCredential() {
    if (!this.data.invitationId || this.data.revoking) return;
    this.setData({ revoking: true });
    try {
      await revokeStaffInvitation(this.data.invitationId);
      this.clearCredential();
      wx.showToast({ title: "凭证已撤销", icon: "success" });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "撤销失败",
        icon: "none",
      });
    } finally {
      this.setData({ revoking: false });
    }
  },
  startCredentialCountdown() {
    this.stopCredentialCountdown();
    if (!this.data.credentialExpireAt) return;
    this.refreshCredentialCountdown();
    if (this.data.credentialCountdown <= 0) return;
    this.credentialTimer = setInterval(() => {
      this.refreshCredentialCountdown();
    }, 1000);
  },
  refreshCredentialCountdown() {
    const next = Math.max(
      0,
      Math.ceil((this.data.credentialExpireAt - Date.now()) / 1000),
    );
    this.setData({ credentialCountdown: next });
    if (next === 0) this.stopCredentialCountdown();
  },
  stopCredentialCountdown() {
    if (this.credentialTimer) clearInterval(this.credentialTimer);
    this.credentialTimer = undefined;
  },
  clearCredential() {
    this.stopCredentialCountdown();
    this.setData({
      invitationId: "",
      credentialCode: "",
      credentialCountdown: 0,
      credentialExpireAt: 0,
    });
  },
  async toggle(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id);
    const item = this.data.staff.find((value) => value.id === id);
    if (!item) return;
    try {
      if (item.status === "ACTIVE") await disableStaff(id);
      else await activateStaff(id);
      await this.load();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "操作失败",
        icon: "none",
      });
    }
  },
  credentialTimer: undefined as ReturnType<typeof setInterval> | undefined,
});
