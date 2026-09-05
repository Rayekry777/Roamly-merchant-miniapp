import { merchantStore } from "../../store/merchant";
import { guardActiveMerchant } from "../../utils/merchant-guard";
import { syncMerchantTabBar } from "../../utils/routes";

Page({
  data: {
    loading: true,
    error: "",
    shopName: "当前门店",
    roleLabel: "商户",
    canRedemption: false,
    canOrder: false,
    canVoucher: false,
    canFinance: false,
    canStaff: false,
  },
  onShow() {
    syncMerchantTabBar(this);
    void this.load();
  },
  async load() {
    if (!(await guardActiveMerchant({ route: "/pages/operations/index" })))
      return;
    this.setData({ loading: true, error: "" });
    try {
      const current = await merchantStore.restore();
      if (!current) return;
      const permissions = current.permissions;
      this.setData({
        shopName: current.shop?.name || "当前门店",
        roleLabel: current.roleLabel,
        canRedemption: permissions.includes("merchant:redemption:manage"),
        canOrder: permissions.includes("merchant:order:read"),
        canVoucher: permissions.includes("merchant:voucher:manage"),
        canFinance: permissions.includes("merchant:finance:read"),
        canStaff: permissions.includes("merchant:staff:manage"),
      });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "经营中心加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  openVerification() {
    wx.navigateTo({ url: "/pages/verification/index" });
  },
  openRedemptions() {
    wx.navigateTo({ url: "/pages/redemptions/index" });
  },
  openOrders() {
    wx.navigateTo({ url: "/pages/orders/index" });
  },
  openVouchers() {
    wx.navigateTo({ url: "/pages/vouchers/index" });
  },
  openSettlements() {
    wx.navigateTo({ url: "/pages/settlements/index" });
  },
  openStaff() {
    wx.navigateTo({ url: "/pages/staff/index" });
  },
});
