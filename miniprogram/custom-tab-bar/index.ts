import { merchantTabRoutes } from "../utils/routes";

Component({
  data: {
    value: "/pages/workbench/index",
    items: [
      { value: merchantTabRoutes[0], label: "首页", icon: "home" },
      { value: merchantTabRoutes[1], label: "消息", icon: "notification" },
      { value: merchantTabRoutes[2], label: "我的", icon: "user" },
    ],
  },
  methods: {
    select(event: WechatMiniprogram.TouchEvent) {
      const url = String(event.currentTarget.dataset.value || "");
      if (!merchantTabRoutes.includes(url as never) || url === this.data.value)
        return;
      this.setData({ value: url });
      wx.switchTab({ url });
    },
  },
});
