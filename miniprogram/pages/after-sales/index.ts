import { listAfterSales, type AfterSale } from "../../api/after-sales";
import { formatDateTime, formatFen } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";

const labels: Record<string, string> = {
  REQUESTED: "待平台处理",
  PROCESSING: "退款处理中",
  SUCCEEDED: "退款成功",
  FAILED: "退款失败",
  REJECTED: "已驳回",
};
Page({
  data: {
    items: [] as Array<
      AfterSale & { amountText: string; statusText: string; timeText: string }
    >,
    loading: true,
    error: "",
    status: "",
  },
  onShow() {
    void this.load();
  },
  async load() {
    if (
      !(await guardMerchantPermission(
        "merchant:after-sales:read",
        "当前账号无权查看售后",
        { route: "/pages/after-sales/index" },
      ))
    )
      return;
    this.setData({ loading: true, error: "" });
    try {
      const result = await listAfterSales(this.data.status || undefined);
      const items = (result.data?.items || []).map((item) => ({
        ...item,
        amountText: formatFen(item.amount),
        statusText: labels[item.status] || item.status,
        timeText: formatDateTime(item.requestedTime),
      }));
      this.setData({ items, loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "售后加载失败",
      });
    }
  },
  openCreate() {
    wx.navigateTo({ url: "/pages/after-sales/create" });
  },
  retry() {
    void this.load();
  },
});
