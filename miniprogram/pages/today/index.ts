import {
  loadServiceFeePolicy,
  loadTodayFinance,
  type TodayFinance,
  type ServiceFeePolicy,
} from "../../api/finance";
import { formatFen, formatDate } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";

Page({
  data: {
    loading: true,
    error: "",
    today: null as
      | (TodayFinance & {
          dateText: string;
          redemptionAmountText: string;
          saleAmountText: string;
          merchantSubsidyAmountText: string;
          platformSubsidyAmountText: string;
          customerPaidAmountText: string;
          serviceFeeAmountText: string;
          estimatedIncomeAmountText: string;
          refundAmountText: string;
          netReceiptAmountText: string;
        })
      | null,
    policy: null as ServiceFeePolicy | null,
  },
  onShow() {
    void this.activate();
  },
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:finance:read",
        "当前账号暂不能查看今日数据",
        { route: "/pages/today/index" },
      ))
    )
      return;
    this.setData({ loading: true, error: "" });
    try {
      const [today, policy] = await Promise.all([
        loadTodayFinance(),
        loadServiceFeePolicy(),
      ]);
      if (!today.data) throw new Error("今日数据响应格式异常");
      const value = today.data;
      this.setData({
        today: {
          ...value,
          dateText: formatDate(value.date),
          redemptionAmountText: formatFen(value.redemptionAmount),
          saleAmountText: formatFen(value.saleAmount),
          merchantSubsidyAmountText: formatFen(value.merchantSubsidyAmount),
          platformSubsidyAmountText: formatFen(value.platformSubsidyAmount),
          customerPaidAmountText: formatFen(value.customerPaidAmount),
          serviceFeeAmountText: formatFen(value.serviceFeeAmount),
          estimatedIncomeAmountText: formatFen(value.estimatedIncomeAmount),
          refundAmountText: formatFen(value.refundAmount),
          netReceiptAmountText: formatFen(value.netReceiptAmount),
        },
        policy: policy.data || null,
      });
    } catch (e) {
      this.setData({
        error: e instanceof Error ? e.message : "今日数据加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() {
    void this.activate();
  },
  openRedemptions() {
    wx.navigateTo({ url: "/pages/redemptions/index" });
  },
});
