import {
  createAfterSale,
  getRefundCandidate,
  type RefundCandidate,
} from "../../api/after-sales";
import { formatFen } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
Page({
  data: {
    keyword: "",
    candidate: null as RefundCandidate | null,
    payAmountText: "0.00",
    selectedIds: {} as Record<string, boolean>,
    selectedIdsList: [] as string[],
    description: "",
    searching: false,
    submitting: false,
    helpVisible: false,
  },
  async onLoad() {
    await guardMerchantPermission(
      "merchant:after-sales:create",
      "当前账号无权发起退款",
      { route: "/pages/after-sales/create" },
    );
  },
  onKeyword(e: WechatMiniprogram.Input) {
    this.setData({ keyword: String(e.detail.value || "") });
  },
  async searchCandidate() {
    const keyword = this.data.keyword.trim();
    if (!keyword || this.data.searching)
      return wx.showToast({ title: "请输入订单编号或券码", icon: "none" });
    this.setData({ searching: true });
    try {
      const result = await getRefundCandidate(keyword);
      const raw = result.data;
      const candidate = raw
        ? {
            ...raw,
            vouchers: raw.vouchers.map((item) => ({
              ...item,
              amountText: formatFen(item.refundAmount),
            })),
          }
        : null;
      const selectedIds: Record<string, boolean> = {};
      const matched = candidate?.vouchers.find(
        (item) => item.id === candidate.matchedVoucherId,
      );
      if (matched?.refundable) selectedIds[matched.id] = true;
      this.setData({
        candidate,
        payAmountText: formatFen(candidate?.payAmount),
        selectedIds,
        selectedIdsList: Object.keys(selectedIds),
        description: "",
      });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "订单查询失败",
        icon: "none",
      });
    } finally {
      this.setData({ searching: false });
    }
  },
  toggleVoucher(e: WechatMiniprogram.TouchEvent) {
    if (!e.currentTarget.dataset.refundable) return;
    const id = String(e.currentTarget.dataset.id || "");
    const selectedIds = {
      ...this.data.selectedIds,
      [id]: !this.data.selectedIds[id],
    };
    if (!selectedIds[id]) delete selectedIds[id];
    this.setData({
      selectedIds,
      selectedIdsList: Object.keys(selectedIds).sort(),
    });
  },
  onDescription(e: WechatMiniprogram.Input) {
    this.setData({ description: String(e.detail.value || "") });
  },
  resetSearch() {
    this.setData({
      candidate: null,
      keyword: "",
      selectedIds: {},
      selectedIdsList: [],
      description: "",
    });
  },
  showHelp() {
    this.setData({ helpVisible: true });
  },
  closeHelp() {
    this.setData({ helpVisible: false });
  },
  noop() {},
  async submit() {
    const candidate = this.data.candidate;
    if (!candidate || !this.data.selectedIdsList.length || this.data.submitting)
      return;
    this.setData({ submitting: true });
    try {
      const result = await createAfterSale(
        {
          orderId: candidate.orderId,
          voucherIds: this.data.selectedIdsList,
          reasonCode: "SHOP_EXCEPTION",
          description: this.data.description.trim() || undefined,
        },
        `merchant-refund-${candidate.orderId}-${this.data.selectedIdsList.join("-")}`,
      );
      if (result.data) {
        wx.showToast({ title: "已提交平台处理", icon: "success" });
        wx.navigateBack();
      }
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "提交失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
