import {
  getMerchantSettlement,
  type MerchantSettlement,
} from "../../api/settlement";
import {
  formatDate,
  formatDateTime,
  formatFen,
  settlementStatus,
} from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";

type SettlementDetail = MerchantSettlement & {
  settlementDateText: string;
  processedTimeText: string;
  totalAmountText: string;
  statusText: string;
  statusTone: string;
};

Page({
  data: {
    detail: null as SettlementDetail | null,
    loading: true,
    error: "",
  },
  onLoad(options) {
    this.settlementId = String(options.id || "");
  },
  onShow() {
    void this.activate();
  },
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:finance:read",
        "当前角色无权查看结算",
        {
          route: "/pages/settlements/detail",
          query: { id: this.settlementId },
        },
      ))
    )
      return;
    void this.load();
  },
  async load() {
    if (!this.settlementId) {
      this.setData({ loading: false, error: "缺少结算批次编号" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const result = await getMerchantSettlement(this.settlementId);
      if (!result.data) throw new Error("结算详情响应格式异常");
      const value = result.data;
      const status = settlementStatus(value.status);
      this.setData({
        detail: {
          ...value,
          settlementDateText: formatDate(value.settlementDate),
          processedTimeText: formatDateTime(value.processedTime),
          totalAmountText: formatFen(value.totalAmount),
          statusText: status.text,
          statusTone: status.tone,
        },
      });
    } catch (error) {
      this.setData({
        detail: null,
        error: error instanceof Error ? error.message : "结算详情加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  settlementId: "",
});
