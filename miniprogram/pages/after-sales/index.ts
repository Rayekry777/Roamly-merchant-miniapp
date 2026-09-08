import {
  listAfterSales,
  type AfterSale,
  type RefundStage,
} from "../../api/after-sales";
import { formatDateTime, formatFen } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";

const stages: Array<{ value: RefundStage; label: string }> = [
  { value: "PENDING", label: "待处理" },
  { value: "PROCESSING", label: "平台处理中" },
  { value: "DECLINED", label: "已拒绝/失败" },
  { value: "COMPLETED", label: "已退款" },
];
const labels: Record<string, { text: string; tone: string }> = {
  REQUESTED: { text: "待平台处理", tone: "pending" },
  PROCESSING: { text: "退款处理中", tone: "processing" },
  SUCCEEDED: { text: "退款成功", tone: "success" },
  FAILED: { text: "退款失败", tone: "danger" },
  REJECTED: { text: "已驳回", tone: "danger" },
};
type Item = AfterSale & {
  amountText: string;
  statusText: string;
  statusTone: string;
  timeText: string;
};

Page({
  data: {
    stages,
    stage: "PENDING" as RefundStage,
    items: [] as Item[],
    keyword: "",
    searchVisible: false,
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
  },
  onShow() {
    void this.load(true);
  },
  onHide() {
    this.stopRealtime?.();
    this.stopRealtime = undefined;
  },
  async load(reset = true) {
    if (
      !(await guardMerchantPermission(
        "merchant:after-sales:read",
        "当前账号无权查看售后",
        { route: "/pages/after-sales/index" },
      ))
    )
      return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await listAfterSales({
        stage: this.data.stage,
        keyword: this.data.keyword.trim() || undefined,
        page,
      });
      const incoming = (result.data?.items || []).map((item) => ({
        ...item,
        amountText: formatFen(item.amount),
        statusText: labels[item.status]?.text || item.status,
        statusTone: labels[item.status]?.tone || "muted",
        timeText: formatDateTime(item.requestedTime),
      }));
      const items = reset ? incoming : [...this.data.items, ...incoming];
      this.setData({
        items,
        page: page + 1,
        hasMore:
          items.length < (result.data?.total || 0) && incoming.length > 0,
        loading: false,
        error: "",
      });
      if (!this.stopRealtime)
        this.stopRealtime = connectMerchantRealtime((event) => {
          if (event.type === "REFUND_UPDATED") void this.load(true);
        });
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "售后加载失败",
        ...(reset ? { items: [], page: 1, hasMore: true } : {}),
      });
    }
  },
  toggleSearch() {
    this.setData({ searchVisible: !this.data.searchVisible });
  },
  onKeyword(e: WechatMiniprogram.Input) {
    this.setData({ keyword: String(e.detail.value || "") });
  },
  search() {
    void this.load(true);
  },
  selectStage(e: WechatMiniprogram.TouchEvent) {
    const stage = String(e.currentTarget.dataset.stage) as RefundStage;
    if (stage !== this.data.stage) {
      this.setData({ stage });
      void this.load(true);
    }
  },
  retry() {
    void this.load(true);
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.load(false);
  },
  stopRealtime: undefined as (() => void) | undefined,
});
