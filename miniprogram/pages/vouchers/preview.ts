import { downloadBusinessImage } from "../../api/merchant-application";
import { merchantStore } from "../../store/merchant";
import { voucherDraftStore } from "../../store/voucher-draft";
import type { BusinessMedia } from "../../types/merchant-application";
import type { VoucherDraftForm } from "../../types/voucher";
import { voucherTypeLabels } from "../../types/voucher";
import { guardVoucherManager } from "../../utils/merchant-guard";
import { ApiError } from "../../utils/request";

const dayLabels: Record<string, string> = {
  MONDAY: "周一",
  TUESDAY: "周二",
  WEDNESDAY: "周三",
  THURSDAY: "周四",
  FRIDAY: "周五",
  SATURDAY: "周六",
  SUNDAY: "周日",
};

Page({
  data: {
    loading: true,
    submitting: false,
    error: "",
    draft: null as VoucherDraftForm | null,
    shopName: "当前门店",
    shopAddress: "",
    displayTitle: "未命名团购券",
    typeLabel: "",
    statusLabel: "草稿",
    priceText: "待填写",
    marketText: "",
    benefitLabel: "",
    benefitText: "",
    saleTimeText: "待填写",
    validityText: "待填写",
    usageRows: [] as Array<{ label: string; value: string }>,
    excludedText: "无",
    packageItems: [] as Array<Record<string, string>>,
    canEdit: false,
    canSubmit: false,
    submitErrorStep: 0,
  },
  async onLoad(options: { id?: string }) {
    const id = options.id?.trim();
    if (!id) {
      this.setData({ loading: false, error: "缺少团购券编号" });
      return;
    }
    if (!(await guardVoucherManager())) return;
    await this.load(id);
  },
  async load(id: string) {
    this.setData({ loading: true, error: "", submitErrorStep: 0 });
    try {
      const draft =
        voucherDraftStore.formDraft?.id === id
          ? cloneForm(voucherDraftStore.formDraft)
          : await voucherDraftStore.load(id);
      this.setView(draft);
      await this.loadPrivatePreviews(draft);
    } catch (error) {
      this.setData({ error: message(error) });
    } finally {
      this.setData({ loading: false });
    }
  },
  retryLoad() {
    const id = this.data.draft?.id || this.options?.id;
    if (id) void this.load(String(id));
  },
  async loadPrivatePreviews(draft: VoucherDraftForm) {
    const media = [draft.coverMedia, ...draft.detailMedia].filter(
      (item): item is BusinessMedia => Boolean(item && !item.localPath),
    );
    await Promise.all(
      media.map(async (item) => {
        try {
          item.localPath = await downloadBusinessImage(item);
        } catch {
          item.localPath = "";
        }
      }),
    );
    this.setView(draft);
  },
  setView(draft: VoucherDraftForm) {
    const shop = merchantStore.current?.shop;
    const benefit = benefitView(draft);
    this.setData({
      draft,
      shopName: shop?.name || "当前门店",
      shopAddress: shop?.address || "",
      displayTitle: draft.title || "未命名团购券",
      typeLabel: voucherTypeLabels[draft.productType],
      statusLabel: draft.saleStatusLabel || draft.reviewStatusLabel,
      priceText: draft.priceYuan ? `¥${moneyText(draft.priceYuan)}` : "待填写",
      marketText: draft.marketYuan ? `¥${moneyText(draft.marketYuan)}` : "",
      benefitLabel: benefit.label,
      benefitText: benefit.value,
      saleTimeText: dateRange(draft.saleBeginTime, draft.saleEndTime),
      validityText: validityText(draft),
      usageRows: usageRows(draft),
      excludedText: draft.excludedDates.join("、") || "无",
      packageItems: draft.packageItems.map((item) => ({
        name: item.name || "未填写名称",
        quantity: `${item.quantity || "0"}${item.unit || "份"}`,
        price: item.unitPriceYuan ? `¥${moneyText(item.unitPriceYuan)}` : "",
      })),
      canEdit:
        draft.reviewStatus === "DRAFT" || draft.reviewStatus === "REJECTED",
      canSubmit: draft.reviewStatus === "DRAFT",
    });
  },
  edit() {
    const id = this.data.draft?.id;
    if (!id) return;
    const pages = getCurrentPages();
    const previous = pages[pages.length - 2];
    if (previous?.route === "pages/vouchers/editor") {
      wx.navigateBack();
      return;
    }
    wx.navigateTo({ url: `/pages/vouchers/editor?id=${id}` });
  },
  submit() {
    if (this.data.submitting || !this.data.canSubmit) return;
    wx.showModal({
      title: "提交平台审核",
      content: "提交后当前版本将锁定，审核完成前不能修改。",
      confirmText: "确认提交",
      confirmColor: "#ff5f57",
      success: (result) => {
        if (result.confirm) void this.confirmSubmit();
      },
    });
  },
  async confirmSubmit() {
    this.setData({ submitting: true, error: "", submitErrorStep: 0 });
    try {
      const product = await voucherDraftStore.submit();
      const draft = voucherDraftStore.formDraft;
      if (draft) this.setView(cloneForm(draft));
      this.setData({ canSubmit: false, canEdit: false });
      wx.showToast({ title: product.reviewStatusLabel, icon: "success" });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const id = this.data.draft?.id;
        if (id) await this.load(id);
        this.setData({ error: "团购券状态或版本已变化，请重新确认。" });
      } else if (
        error instanceof ApiError &&
        (error.fieldErrors?.length ?? 0) > 0
      ) {
        const fieldErrors = error.fieldErrors ?? [];
        const step = errorStep(fieldErrors.map((item) => item.field));
        this.setData({
          error: `${fieldErrors[0]?.message || error.message}，请返回第 ${step} 步修改。`,
          submitErrorStep: step,
        });
      } else {
        this.setData({ error: message(error) });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },
});

function benefitView(draft: VoucherDraftForm): {
  label: string;
  value: string;
} {
  if (draft.productType === "CASH") {
    return {
      label: "抵扣金额",
      value: draft.faceValueYuan
        ? `¥${moneyText(draft.faceValueYuan)}`
        : "待填写",
    };
  }
  if (draft.productType === "DISCOUNT") {
    return {
      label: "券面折扣",
      value: draft.discountRate ? `${draft.discountRate} 折` : "待填写",
    };
  }
  if (draft.productType === "MULTI_USE") {
    return {
      label: "可用次数",
      value: draft.totalUseCount ? `${draft.totalUseCount} 次` : "待填写",
    };
  }
  return {
    label: "套餐内容",
    value: draft.packageItems.length
      ? `${draft.packageItems.length} 项`
      : "待填写",
  };
}

function validityText(draft: VoucherDraftForm): string {
  if (draft.validityType === "DAYS_AFTER_PURCHASE") {
    return draft.validDays ? `购买后 ${draft.validDays} 天内有效` : "待填写";
  }
  return dateRange(draft.validBeginTime, draft.validEndTime);
}

function usageRows(draft: VoucherDraftForm) {
  return draft.usageRules.map((rule) => ({
    label: dayLabels[rule.dayOfWeek] || rule.dayOfWeek,
    value: rule.closed
      ? "不可用"
      : rule.periods
          .map((period) => `${period.open}-${period.close}`)
          .join("、") || "未配置",
  }));
}

function dateRange(begin: string, end: string): string {
  if (!begin || !end) return "待填写";
  return `${displayDateTime(begin)} 至 ${displayDateTime(end)}`;
}

function displayDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function moneyText(value: string): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
}

export function errorStep(fields: string[]): number {
  const stepOne = ["title", "packageItems", "productType"];
  const stepTwo = [
    "priceAmount",
    "marketAmount",
    "faceValueAmount",
    "minimumSpendAmount",
    "discountRateBps",
    "maximumDiscountAmount",
    "totalUseCount",
    "totalStock",
    "purchaseLimit",
    "saleBeginTime",
    "saleEndTime",
  ];
  const stepFour = ["coverMediaId", "detailMediaIds"];
  if (fields.some((field) => stepOne.some((name) => field.startsWith(name)))) {
    return 1;
  }
  if (fields.some((field) => stepTwo.some((name) => field.startsWith(name)))) {
    return 2;
  }
  if (fields.some((field) => stepFour.some((name) => field.startsWith(name)))) {
    return 4;
  }
  return 3;
}

function cloneForm(value: VoucherDraftForm): VoucherDraftForm {
  return JSON.parse(JSON.stringify(value)) as VoucherDraftForm;
}

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : "操作失败，请稍后重试";
}
