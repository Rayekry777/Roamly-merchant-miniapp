import { createAfterSale } from "../../api/after-sales";
import { guardMerchantPermission } from "../../utils/merchant-guard";
Page({
  data: {
    orderId: "",
    voucherId: "",
    reasonCode: "SHOP_EXCEPTION",
    description: "",
    submitting: false,
  },
  onLoad() {
    void guardMerchantPermission(
      "merchant:after-sales:create",
      "当前账号无权发起退款",
      { route: "/pages/after-sales/create" },
    );
  },
  onOrder(e: WechatMiniprogram.Input) {
    this.setData({ orderId: String(e.detail.value || "") });
  },
  onVoucher(e: WechatMiniprogram.Input) {
    this.setData({ voucherId: String(e.detail.value || "") });
  },
  onReason(e: WechatMiniprogram.Input) {
    this.setData({ description: String(e.detail.value || "") });
  },
  async submit() {
    if (!this.data.orderId || !this.data.voucherId || this.data.submitting)
      return wx.showToast({ title: "请填写订单和券", icon: "none" });
    this.setData({ submitting: true });
    try {
      const result = await createAfterSale(
        {
          orderId: this.data.orderId,
          voucherIds: [this.data.voucherId],
          reasonCode: this.data.reasonCode,
          description: this.data.description,
        },
        `merchant-refund-${Date.now()}`,
      );
      if (result.data) {
        wx.showToast({ title: "已提交平台处理", icon: "success" });
        wx.navigateBack();
      }
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "提交失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
