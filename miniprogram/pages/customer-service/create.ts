import {
  createMerchantCustomerServiceTicket,
  type CustomerServiceInput,
} from "../../api/customer-service";

const types = [
  { value: "GENERAL", label: "一般咨询" },
  { value: "REFUND", label: "退款问题" },
  { value: "REDEMPTION", label: "核销问题" },
  { value: "ORDER", label: "订单问题" },
  { value: "SETTLEMENT", label: "结算问题" },
] as const;
Page({
  data: {
    types,
    typeIndex: 0,
    subject: "",
    description: "",
    orderId: "",
    voucherId: "",
    refundId: "",
    redemptionId: "",
    submitting: false,
  },
  onLoad(options: Record<string, string | undefined>) {
    const inferred = options.refundId
      ? "REFUND"
      : options.redemptionId
        ? "REDEMPTION"
        : options.orderId
          ? "ORDER"
          : options.type === "SETTLEMENT"
            ? "SETTLEMENT"
            : "GENERAL";
    this.setData({
      typeIndex: Math.max(
        0,
        types.findIndex((item) => item.value === inferred),
      ),
      subject: decodeURIComponent(options.subject || ""),
      orderId: options.orderId || "",
      voucherId: options.voucherId || "",
      refundId: options.refundId || "",
      redemptionId: options.redemptionId || "",
    });
  },
  chooseType(event: WechatMiniprogram.PickerChange) {
    this.setData({ typeIndex: Number(event.detail.value) });
  },
  inputSubject(event: WechatMiniprogram.Input) {
    this.setData({ subject: String(event.detail.value || "") });
  },
  inputDescription(event: WechatMiniprogram.Input) {
    this.setData({ description: String(event.detail.value || "") });
  },
  async submit() {
    const subject = this.data.subject.trim();
    const description = this.data.description.trim();
    if (!subject) {
      wx.showToast({ title: "请填写问题主题", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload: CustomerServiceInput = {
        type: types[this.data.typeIndex]!.value,
        subject,
        ...(description ? { description } : {}),
        ...(this.data.orderId ? { orderId: this.data.orderId } : {}),
        ...(this.data.voucherId ? { voucherId: this.data.voucherId } : {}),
        ...(this.data.refundId ? { refundId: this.data.refundId } : {}),
        ...(this.data.redemptionId
          ? { redemptionId: this.data.redemptionId }
          : {}),
      };
      const result = await createMerchantCustomerServiceTicket(payload);
      if (!result.data) throw new Error("创建工单失败");
      wx.redirectTo({
        url:
          "/pages/customer-service/detail?id=" +
          encodeURIComponent(result.data.id),
      });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "创建工单失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
