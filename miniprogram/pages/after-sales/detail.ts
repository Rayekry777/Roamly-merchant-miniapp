import {
  getAfterSale,
  getAfterSaleTimeline,
  type AfterSale,
  type RefundTimelineEvent,
} from "../../api/after-sales";
import { formatFen } from "../../utils/format";

type Detail = AfterSale & {
  amountText: string;
  decisionText: string;
  executionText: string;
  items: Array<
    NonNullable<AfterSale["items"]>[number] & {
      refundAmountText: string;
      serviceFeeText: string;
      reversedIncomeText: string;
    }
  >;
};
const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "等待平台审核",
  AUTO_APPROVED: "自动通过",
  MANUAL_APPROVED: "平台已通过",
  REJECTED: "审核未通过",
  WAITING_EXECUTION: "等待退款",
  PROCESSING: "退款处理中",
  RETRY_WAITING: "等待重试",
  SUCCESS: "退款成功",
  PARTIAL_SUCCESS: "部分退款",
  FAILED: "退款失败",
  MANUAL_REQUIRED: "平台人工处理",
};
Page({
  data: {
    detail: null as Detail | null,
    timeline: [] as Array<
      RefundTimelineEvent & {
        key: string;
        statusText: string;
        timeText: string;
      }
    >,
    loading: true,
    error: "",
  },
  onLoad(options: Record<string, string | undefined>) {
    this.refundId = String(options.id || "");
    void this.load();
  },
  async load() {
    if (!this.refundId)
      return this.setData({ loading: false, error: "缺少退款编号" });
    this.setData({ loading: true, error: "" });
    try {
      const [detailResult, timelineResult] = await Promise.all([
        getAfterSale(this.refundId),
        getAfterSaleTimeline(this.refundId),
      ]);
      if (!detailResult.data) throw new Error("退款记录不存在");
      const value = detailResult.data;
      const detail: Detail = {
        ...value,
        amountText: formatFen(value.amount),
        decisionText:
          statusLabels[value.decisionStatus || ""] ||
          value.decisionStatus ||
          "--",
        executionText:
          statusLabels[value.executionStatus || ""] ||
          value.executionStatus ||
          "--",
        items: (value.items || []).map((item) => ({
          ...item,
          refundAmountText: formatFen(item.refundAmount),
          serviceFeeText: formatFen(item.refundedServiceFeeAmount),
          reversedIncomeText: formatFen(item.reversedIncomeAmount),
        })),
      };
      this.setData({
        detail,
        timeline: (timelineResult.data || []).map((item, index) => ({
          ...item,
          key: `${item.type}-${item.occurredAt || index}`,
          statusText: statusLabels[item.status] || "状态已更新",
          timeText: (item.occurredAt || "").replace("T", " ").slice(0, 19),
        })),
        loading: false,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "退款详情加载失败",
      });
    }
  },
  contactService() {
    if (!this.data.detail) return;
    wx.navigateTo({
      url:
        "/pages/customer-service/create?refundId=" +
        encodeURIComponent(this.refundId) +
        "&orderId=" +
        encodeURIComponent(this.data.detail.orderId) +
        "&voucherId=" +
        encodeURIComponent(this.data.detail.voucherId || "") +
        "&subject=" +
        encodeURIComponent("商户退款问题"),
    });
  },
  retry() {
    void this.load();
  },
  refundId: "",
});
