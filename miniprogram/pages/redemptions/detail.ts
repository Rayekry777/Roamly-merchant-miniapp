import {
  getMerchantRedemption,
  updateRedemptionNote,
  type Redemption,
} from "../../api/redemption";
import { formatFen, formatDateTime } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
Page({
  data: {
    item: null as
      | (Redemption & {
          redeemedTimeText?: string;
          incomeText?: Record<string, string>;
        })
      | null,
    loading: true,
    error: "",
  },
  onLoad(o) {
    this.id = String(o.id || "");
  },
  onShow() {
    void this.load();
  },
  async load() {
    if (
      !(await guardMerchantPermission(
        "merchant:redemption:manage",
        "当前角色无权查看核销详情",
        { route: `/pages/redemptions/detail?id=${this.id}` },
      ))
    )
      return;
    try {
      const r = await getMerchantRedemption(this.id);
      if (!r.data) throw new Error("核销详情响应格式异常");
      const v = r.data;
      this.setData({
        item: {
          ...v,
          redeemedTimeText: formatDateTime(v.redeemedTime),
          incomeText: v.income
            ? {
                sale: formatFen(v.income.saleAmount),
                subsidy: formatFen(v.income.merchantSubsidyAmount),
                discount: formatFen(v.income.platformDiscountAmount),
                paid: formatFen(v.income.customerPaidAmount),
                fee: formatFen(v.income.serviceFeeAmount),
                income: formatFen(v.income.estimatedIncomeAmount),
              }
            : {},
        },
      });
    } catch (e) {
      this.setData({ error: e instanceof Error ? e.message : "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async editNote() {
    const result =
      await new Promise<WechatMiniprogram.ShowModalSuccessCallbackResult>(
        (resolve) =>
          wx.showModal({
            title: "商家备注",
            editable: true,
            content: this.data.item?.merchantNote || "",
            success: resolve,
          }),
      );
    if (!result.confirm) return;
    try {
      await updateRedemptionNote(this.id, result.content || "");
      await this.load();
    } catch (e) {
      wx.showToast({
        title: e instanceof Error ? e.message : "保存失败",
        icon: "none",
      });
    }
  },
  id: "",
});
