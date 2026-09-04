import { merchantStore } from "../store/merchant";

export async function guardActiveMerchant(): Promise<boolean> {
  try {
    const current = await merchantStore.restore(true);
    if (current?.status === "ACTIVE") return true;
    wx.switchTab({ url: "/pages/me/index" });
    if (current) {
      wx.showToast({ title: `当前状态：${current.statusLabel}`, icon: "none" });
    }
    return false;
  } catch {
    wx.switchTab({ url: "/pages/me/index" });
    return false;
  }
}

export async function guardVoucherManager(): Promise<boolean> {
  if (!(await guardActiveMerchant())) return false;
  const current = merchantStore.current;
  if (current?.permissions.includes("merchant:voucher:manage")) return true;
  wx.showToast({ title: "当前角色无权管理团购券", icon: "none" });
  wx.switchTab({ url: "/pages/me/index" });
  return false;
}
