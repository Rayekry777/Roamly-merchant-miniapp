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
