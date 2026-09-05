import {
  listMerchantRedemptions,
  reverseRedemption,
  type Redemption,
} from "../../api/redemption";
import { merchantStore } from "../../store/merchant";
import { formatDateTime } from "../../utils/format";
import { guardMerchantPermission } from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";

type RedemptionView = Redemption & {
  voucherLast4: string;
  redeemedTimeText: string;
  statusText: string;
  statusTone: string;
};

const PAGE_SIZE = 20;

function toView(item: Redemption): RedemptionView {
  return {
    ...item,
    voucherLast4: item.voucherId.slice(-4),
    redeemedTimeText: formatDateTime(item.redeemedTime),
    statusText: item.status === "REVERSED" ? "已撤销" : "核销成功",
    statusTone: item.status === "REVERSED" ? "muted" : "success",
  };
}

Page({
  data: {
    items: [] as RedemptionView[],
    page: 1,
    hasMore: true,
    loading: true,
    error: "",
    canReverse: false,
    reversingId: "",
  },
  onShow() {
    void this.activate();
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
  async activate() {
    if (
      !(await guardMerchantPermission(
        "merchant:redemption:manage",
        "当前角色无权查看核销记录",
        { route: "/pages/redemptions/index" },
      ))
    )
      return;
    const current = merchantStore.current;
    this.currentMerchantId = current?.id || "";
    this.verifierOnly = current?.role === "VERIFIER";
    this.setData({ canReverse: current?.role !== "VERIFIER" });
    await this.load(true);
    this.stopRealtime?.();
    this.stopRealtime = connectMerchantRealtime((event) => {
      if (["VOUCHER_REDEEMED", "REDEMPTION_REVERSED"].includes(event.type)) {
        void this.load(true);
      }
    });
  },
  async load(reset: boolean) {
    if (!reset && this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true, error: reset ? "" : this.data.error });
    try {
      const result = await listMerchantRedemptions(page, PAGE_SIZE);
      const pageData = result.data;
      if (!pageData || !Array.isArray(pageData.items)) {
        throw new Error("核销记录响应格式异常");
      }
      const visible = this.verifierOnly
        ? pageData.items.filter(
            (item) => item.operatorId === this.currentMerchantId,
          )
        : pageData.items;
      const map = new Map(
        (reset ? [] : this.data.items).map((item) => [item.id, item]),
      );
      visible.forEach((item) => map.set(item.id, toView(item)));
      this.setData({
        items: [...map.values()],
        page: page + 1,
        hasMore: pageData.items.length > 0 && page * PAGE_SIZE < pageData.total,
        error: "",
      });
    } catch (error) {
      this.setData({
        ...(reset ? { items: [], page: 1, hasMore: true } : {}),
        error: error instanceof Error ? error.message : "核销记录加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  retry() {
    void this.load(this.data.items.length === 0);
  },
  async reverse(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || "");
    const item = this.data.items.find((value) => value.id === id);
    if (!item || item.status !== "SUCCEEDED" || this.data.reversingId) return;
    const modal = await new Promise<{ confirm: boolean; content: string }>(
      (resolve) => {
        wx.showModal({
          title: "撤销核销",
          content: "",
          editable: true,
          placeholderText: "请输入撤销原因",
          confirmText: "确认撤销",
          confirmColor: "#d84d49",
          success: (result) =>
            resolve({ confirm: result.confirm, content: result.content || "" }),
          fail: () => resolve({ confirm: false, content: "" }),
        });
      },
    );
    const reason = modal.content.trim();
    if (!modal.confirm) return;
    if (!reason) {
      wx.showToast({ title: "请输入撤销原因", icon: "none" });
      return;
    }
    this.setData({ reversingId: id });
    const key = this.reverseKeys[id] || `reverse-${id}-${Date.now()}`;
    this.reverseKeys[id] = key;
    try {
      await reverseRedemption(id, reason, key);
      delete this.reverseKeys[id];
      this.selectComponent("#success-motion")?.show();
      await this.load(true);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "撤销核销失败",
      });
    } finally {
      this.setData({ reversingId: "" });
    }
  },
  currentMerchantId: "",
  verifierOnly: false,
  reverseKeys: {} as Record<string, string>,
  stopRealtime: undefined as (() => void) | undefined,
});
