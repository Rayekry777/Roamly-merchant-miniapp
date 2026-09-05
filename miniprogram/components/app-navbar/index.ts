Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: "Roamly 商户" },
    back: { type: Boolean, value: true },
  },
  data: { statusBarHeight: 24, navigationHeight: 44 },
  lifetimes: {
    attached() {
      const windowInfo = wx.getWindowInfo();
      let navigationHeight = 44;
      try {
        const capsule = wx.getMenuButtonBoundingClientRect();
        navigationHeight = Math.max(
          44,
          (capsule.top - windowInfo.statusBarHeight) * 2 + capsule.height,
        );
      } catch {
        // 基础库不支持胶囊信息时使用微信标准导航高度。
      }
      this.setData({
        statusBarHeight: windowInfo.statusBarHeight || 24,
        navigationHeight,
      });
    },
  },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) wx.navigateBack();
      else wx.switchTab({ url: "/pages/workbench/index" });
    },
  },
});
