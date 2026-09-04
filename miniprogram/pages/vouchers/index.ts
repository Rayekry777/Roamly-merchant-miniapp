import {
  createMerchantVoucherProduct,
  listMerchantVoucherProducts,
} from "../../api/merchant-voucher";
import { downloadBusinessImage } from "../../api/merchant-application";
import { voucherDraftStore } from "../../store/voucher-draft";
import type {
  MerchantVoucherProduct,
  VoucherProductType,
  VoucherReviewStatus,
} from "../../types/voucher";
import {
  voucherProductTypes,
  voucherReviewLabels,
  voucherTypeLabels,
} from "../../types/voucher";
import { guardVoucherManager } from "../../utils/merchant-guard";
import { ApiError } from "../../utils/request";

const reviewFilters: Array<{ value: "" | VoucherReviewStatus; label: string }> =
  [
    { value: "", label: "全部" },
    { value: "DRAFT", label: "草稿" },
    { value: "PENDING", label: "审核中" },
    { value: "APPROVED", label: "已通过" },
    { value: "REJECTED", label: "未通过" },
  ];

Page({
  data: {
    loading: true,
    commandBusy: false,
    error: "",
    keyword: "",
    reviewStatus: "" as "" | VoucherReviewStatus,
    productType: "" as "" | VoucherProductType,
    reviewFilters,
    typeNames: [
      "全部券型",
      ...voucherProductTypes.map((type) => voucherTypeLabels[type]),
    ],
    typeIndex: 0,
    items: [] as Array<Record<string, unknown>>,
    total: 0,
  },
  onLoad() {
    void this.load();
  },
  onPullDownRefresh() {
    void this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    if (!(await guardVoucherManager())) return;
    this.setData({ loading: true, error: "" });
    try {
      const result = await listMerchantVoucherProducts({
        reviewStatus: this.data.reviewStatus || undefined,
        productType: this.data.productType || undefined,
        keyword: this.data.keyword,
        page: 1,
        size: 100,
      });
      await Promise.all(
        result.items.map(async (product) => {
          if (!product.coverMedia || product.coverMedia.localPath) return;
          try {
            product.coverMedia.localPath = await downloadBusinessImage(
              product.coverMedia,
            );
          } catch {
            product.coverMedia.localPath = "";
          }
        }),
      );
      this.setData({
        items: result.items.map(toListItem),
        total: result.total,
      });
    } catch (error) {
      this.setData({ error: message(error) });
    } finally {
      this.setData({ loading: false });
    }
  },
  selectReview(event: WechatMiniprogram.TouchEvent) {
    const reviewStatus = event.currentTarget.dataset.value as
      | ""
      | VoucherReviewStatus;
    this.setData({ reviewStatus });
    void this.load();
  },
  changeType(event: WechatMiniprogram.PickerChange) {
    const typeIndex = Number(event.detail.value);
    this.setData({
      typeIndex,
      productType: typeIndex === 0 ? "" : voucherProductTypes[typeIndex - 1],
    });
    void this.load();
  },
  keywordInput(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value });
  },
  search() {
    void this.load();
  },
  createVoucher() {
    if (this.data.commandBusy) return;
    wx.showActionSheet({
      itemList: voucherProductTypes.map((type) => voucherTypeLabels[type]),
      success: (result) => {
        const productType = voucherProductTypes[result.tapIndex];
        if (productType) void this.create(productType);
      },
    });
  },
  async create(productType: VoucherProductType) {
    this.setData({ commandBusy: true });
    try {
      const product = await createMerchantVoucherProduct(productType);
      wx.navigateTo({ url: `/pages/vouchers/editor?id=${product.id}` });
    } catch (error) {
      wx.showToast({ title: message(error), icon: "none" });
    } finally {
      this.setData({ commandBusy: false });
    }
  },
  edit(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/vouchers/editor?id=${id}` });
  },
  preview(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/vouchers/preview?id=${id}` });
  },
  copy(event: WechatMiniprogram.TouchEvent) {
    if (this.data.commandBusy) return;
    void this.copyVoucher(String(event.currentTarget.dataset.id));
  },
  async copyVoucher(id: string) {
    this.setData({ commandBusy: true });
    try {
      const product = await voucherDraftStore.copy(id);
      wx.showToast({ title: "已创建独立副本", icon: "success" });
      wx.navigateTo({ url: `/pages/vouchers/editor?id=${product.id}` });
    } catch (error) {
      wx.showToast({ title: message(error), icon: "none" });
    } finally {
      this.setData({ commandBusy: false });
    }
  },
  remove(event: WechatMiniprogram.TouchEvent) {
    if (this.data.commandBusy) return;
    const id = String(event.currentTarget.dataset.id);
    wx.showModal({
      title: "删除草稿",
      content: "草稿及已绑定图片将一并删除，且无法恢复。",
      confirmText: "删除",
      confirmColor: "#ff5f57",
      success: (result) => {
        if (result.confirm) void this.removeVoucher(id);
      },
    });
  },
  async removeVoucher(id: string) {
    this.setData({ commandBusy: true });
    try {
      await voucherDraftStore.remove(id);
      wx.showToast({ title: "草稿已删除", icon: "success" });
      await this.load();
    } catch (error) {
      wx.showToast({ title: message(error), icon: "none" });
    } finally {
      this.setData({ commandBusy: false });
    }
  },
});

function toListItem(product: MerchantVoucherProduct) {
  return {
    ...product,
    displayTitle: product.title || "未命名团购券",
    priceText:
      product.priceAmount == null
        ? "价格待填写"
        : `¥${(product.priceAmount / 100).toFixed(2)}`,
    statusText:
      product.saleStatusLabel || voucherReviewLabels[product.reviewStatus],
    statusTone:
      product.reviewStatus === "REJECTED"
        ? "warning"
        : product.reviewStatus === "PENDING"
          ? "pending"
          : product.reviewStatus === "APPROVED"
            ? "active"
            : "neutral",
    coverPath: product.coverMedia?.localPath || "",
    updatedText: product.updateTime?.replace("T", " ").slice(0, 16) || "刚刚",
    editable:
      product.reviewStatus === "DRAFT" || product.reviewStatus === "REJECTED",
    canDelete: product.reviewStatus === "DRAFT" && !product.submittedAt,
  };
}

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : "操作失败，请稍后重试";
}
