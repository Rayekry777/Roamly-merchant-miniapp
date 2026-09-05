import { syncMerchantTabBar } from "../../utils/routes";

Page({
  data: { statusBarHeight: 24 },
  onLoad() {
    this.setData({ statusBarHeight: wx.getWindowInfo().statusBarHeight || 24 });
  },
  onShow() {
    syncMerchantTabBar(this);
  },
  unavailable() {
    wx.showToast({ title: "消息功能暂未开放", icon: "none" });
  },
});
