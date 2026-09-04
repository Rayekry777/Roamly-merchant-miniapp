import { listMerchantOrders, type MerchantOrder } from "../../api/orders";
import { guardActiveMerchant } from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";
const statuses = [
  { value: "", label: "全部" },
  { value: "PENDING_PAYMENT", label: "待支付" },
  { value: "PAID", label: "已支付" },
  { value: "CANCELED", label: "已取消" },
  { value: "REFUNDING", label: "退款中" },
  { value: "REFUNDED", label: "已退款" },
];
Page({
  data: {
    orders: [] as MerchantOrder[],
    statuses,
    status: "",
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
  },
  onShow() {
    void guardActiveMerchant();
    void this.load(true);
    this.stopRealtime = connectMerchantRealtime((event) => {
      if (["PAYMENT_UPDATED", "REFUND_UPDATED"].includes(event.type))
        void this.load(true);
    });
  },
  onHide() {
    this.stopRealtime?.();
    this.stopRealtime = undefined;
  },
  onUnload() {
    this.stopRealtime?.();
  },
  onPullDownRefresh() {
    void this.load(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.load(false);
  },
  async load(reset: boolean) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await listMerchantOrders(
        this.data.status || undefined,
        page,
      );
      const current = reset ? [] : this.data.orders;
      const map = new Map(current.map((item) => [item.id, item]));
      result.data?.items.forEach((item) => map.set(item.id, item));
      const orders = [...map.values()];
      this.setData({
        orders,
        page: page + 1,
        hasMore:
          orders.length < (result.data?.total || 0) &&
          (result.data?.items.length || 0) > 0,
        error: "",
      });
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "订单加载失败",
        ...(reset ? { orders: [], page: 1, hasMore: true } : {}),
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  selectStatus(e: WechatMiniprogram.TouchEvent) {
    const status = String(e.currentTarget.dataset.status || "");
    if (status === this.data.status) return;
    this.setData({ status });
    void this.load(true);
  },
  stopRealtime: undefined as (() => void) | undefined,
});
