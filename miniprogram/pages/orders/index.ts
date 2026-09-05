import { listMerchantOrders, type MerchantOrder } from "../../api/orders";
import { formatDateTime, formatFen, maskBusinessId } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";

type MerchantOrderView = MerchantOrder & {
  statusText: string;
  statusTone: string;
  payAmountText: string;
  maskedUserId: string;
  createdTimeText: string;
};

const statusViews: Record<string, { text: string; tone: string }> = {
  PENDING_PAYMENT: { text: "待支付", tone: "pending" },
  PAID: { text: "已支付", tone: "success" },
  CANCELED: { text: "已取消", tone: "muted" },
  REFUNDING: { text: "退款中", tone: "warning" },
  REFUNDED: { text: "已退款", tone: "muted" },
};

function toOrderView(item: MerchantOrder): MerchantOrderView {
  const status = statusViews[item.status] || {
    text: item.status,
    tone: "muted",
  };
  return {
    ...item,
    statusText: status.text,
    statusTone: status.tone,
    payAmountText: formatFen(item.payAmount),
    maskedUserId: maskBusinessId(item.userId),
    createdTimeText: `创建时间 ${formatDateTime(item.createdTime)}`,
  };
}
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
    orders: [] as MerchantOrderView[],
    statuses,
    status: "",
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
  },
  onShow() {
    void this.activate();
  },
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:order:read",
        "当前角色无权查看订单",
        { route: "/pages/orders/index" },
      ))
    )
      return;
    this.initialized = true;
    await this.load(true);
    this.stopRealtime?.();
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
    if (!this.initialized || (!reset && this.data.loading)) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await listMerchantOrders(
        this.data.status || undefined,
        page,
      );
      const current = reset ? [] : this.data.orders;
      const map = new Map(current.map((item) => [item.id, item]));
      result.data?.items.forEach((item) => map.set(item.id, toOrderView(item)));
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
  retry() {
    void this.load(this.data.orders.length === 0);
  },
  initialized: false,
  stopRealtime: undefined as (() => void) | undefined,
});
