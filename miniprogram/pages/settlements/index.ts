import {
  listMerchantSettlements,
  type MerchantSettlement,
} from "../../api/settlement";
import {
  formatDate,
  formatDateTime,
  formatFen,
  maskBusinessId,
  settlementStatus,
} from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";

type SettlementView = MerchantSettlement & {
  settlementDateText: string;
  processedTimeText: string;
  totalAmountText: string;
  maskedId: string;
  statusText: string;
  statusTone: string;
};

const PAGE_SIZE = 20;

function toView(item: MerchantSettlement): SettlementView {
  const status = settlementStatus(item.status);
  return {
    ...item,
    settlementDateText: formatDate(item.settlementDate),
    processedTimeText: item.processedTime
      ? `处理时间 ${formatDateTime(item.processedTime)}`
      : "等待服务端处理",
    totalAmountText: formatFen(item.totalAmount),
    maskedId: maskBusinessId(item.id),
    statusText: status.text,
    statusTone: status.tone,
  };
}

Page({
  data: {
    items: [] as SettlementView[],
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
  },
  onShow() {
    if (!this.initialized) void this.activate();
  },
  onPullDownRefresh() {
    void this.load(true).finally(() => wx.stopPullDownRefresh());
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) void this.load(false);
  },
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:finance:read",
        "当前角色无权查看结算",
        { route: "/pages/settlements/index" },
      ))
    )
      return;
    this.initialized = true;
    await this.load(true);
  },
  async load(reset: boolean) {
    if (!this.initialized || (!reset && this.data.loading)) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await listMerchantSettlements(page, PAGE_SIZE);
      const pageData = result.data;
      if (!pageData || !Array.isArray(pageData.items)) {
        throw new Error("结算记录响应格式异常");
      }
      const map = new Map(
        (reset ? [] : this.data.items).map((item) => [item.id, item]),
      );
      pageData.items.forEach((item) => map.set(item.id, toView(item)));
      this.setData({
        items: [...map.values()],
        page: page + 1,
        hasMore: pageData.items.length > 0 && page * PAGE_SIZE < pageData.total,
        error: "",
      });
    } catch (error) {
      this.setData({
        ...(reset ? { items: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "结算记录加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() {
    void this.load(this.data.items.length === 0);
  },
  openDetail(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    if (id) wx.navigateTo({ url: `/pages/settlements/detail?id=${id}` });
  },
  initialized: false,
});
