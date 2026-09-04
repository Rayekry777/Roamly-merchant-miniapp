import {
  copyMerchantVoucherProduct,
  deleteMerchantVoucherProduct,
  getMerchantVoucherProduct,
  submitMerchantVoucherProduct,
  updateMerchantVoucherProduct,
} from "../api/merchant-voucher";
import type {
  MerchantVoucherProduct,
  MerchantVoucherProductUpdateRequest,
  VoucherDraftForm,
} from "../types/voucher";
import { businessDays } from "../types/merchant-application";
import { ApiError } from "../utils/request";

class VoucherDraftStore {
  serverSnapshot: MerchantVoucherProduct | null = null;
  formDraft: VoucherDraftForm | null = null;
  conflictDraft: VoucherDraftForm | null = null;
  dirty = false;
  saving = false;
  private submissionKey = "";

  async load(productId: string): Promise<VoucherDraftForm> {
    const product = await getMerchantVoucherProduct(productId);
    this.accept(product);
    this.conflictDraft = null;
    return cloneForm(this.formDraft as VoucherDraftForm);
  }

  replaceForm(value: VoucherDraftForm): void {
    this.formDraft = cloneForm(value);
    this.dirty = true;
    this.submissionKey = "";
  }

  async save(value: VoucherDraftForm): Promise<VoucherDraftForm> {
    this.replaceForm(value);
    this.saving = true;
    try {
      const product = await updateMerchantVoucherProduct(
        value.id,
        toVoucherUpdateRequest(value),
      );
      this.accept(product);
      this.conflictDraft = null;
      return cloneForm(this.formDraft as VoucherDraftForm);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        this.conflictDraft = cloneForm(value);
        const latest = await getMerchantVoucherProduct(value.id);
        this.accept(latest);
      }
      throw error;
    } finally {
      this.saving = false;
    }
  }

  reapplyConflict(): VoucherDraftForm | null {
    if (!this.conflictDraft || !this.serverSnapshot) return null;
    const value = cloneForm(this.conflictDraft);
    value.version = this.serverSnapshot.version;
    value.reviewStatus = this.serverSnapshot.reviewStatus;
    value.reviewStatusLabel = this.serverSnapshot.reviewStatusLabel;
    this.formDraft = value;
    this.conflictDraft = null;
    this.dirty = true;
    this.submissionKey = "";
    return cloneForm(value);
  }

  async submit(): Promise<MerchantVoucherProduct> {
    if (!this.formDraft) throw new ApiError("团购券草稿尚未加载");
    if (!this.submissionKey) this.submissionKey = newIdempotencyKey();
    const product = await submitMerchantVoucherProduct(
      this.formDraft.id,
      this.formDraft.version,
      this.submissionKey,
    );
    this.accept(product);
    return product;
  }

  async copy(productId: string): Promise<MerchantVoucherProduct> {
    return copyMerchantVoucherProduct(productId);
  }

  async remove(productId: string): Promise<void> {
    await deleteMerchantVoucherProduct(productId);
    if (this.serverSnapshot?.id === productId) this.clear();
  }

  clear(): void {
    this.serverSnapshot = null;
    this.formDraft = null;
    this.conflictDraft = null;
    this.dirty = false;
    this.saving = false;
    this.submissionKey = "";
  }

  private accept(product: MerchantVoucherProduct): void {
    this.serverSnapshot = product;
    this.formDraft = formFromVoucher(product);
    this.dirty = false;
    this.submissionKey = "";
  }
}

export function formFromVoucher(
  product: MerchantVoucherProduct,
): VoucherDraftForm {
  return {
    id: product.id,
    productType: product.productType,
    version: product.version,
    title: product.title ?? "",
    subTitle: product.subTitle ?? "",
    coverMedia: product.coverMedia,
    detailMedia: product.detailMedia,
    priceYuan: fenToYuan(product.priceAmount),
    marketYuan: fenToYuan(product.marketAmount),
    faceValueYuan: fenToYuan(product.faceValueAmount),
    minimumSpendYuan: fenToYuan(product.minimumSpendAmount),
    discountRate:
      product.discountRateBps == null
        ? ""
        : formatDecimal(product.discountRateBps / 1000),
    maximumDiscountYuan: fenToYuan(product.maximumDiscountAmount),
    totalUseCount: optionalInteger(product.totalUseCount),
    totalStock: String(product.totalStock),
    purchaseLimit: String(product.purchaseLimit),
    saleBeginTime: product.saleBeginTime ?? "",
    saleEndTime: product.saleEndTime ?? "",
    validityType: product.validityType ?? "DAYS_AFTER_PURCHASE",
    validBeginTime: product.validBeginTime ?? "",
    validEndTime: product.validEndTime ?? "",
    validDays: optionalInteger(product.validDays),
    usageRules:
      product.usageRules.length > 0
        ? clone(product.usageRules)
        : defaultUsageRules(),
    excludedDates: [...product.excludedDates],
    reservationRequired: product.reservationRequired,
    reservationNotice: product.reservationNotice ?? "",
    stackable: product.stackable,
    refundAnytime: product.refundAnytime,
    refundExpired: product.refundExpired,
    packageItems: product.packageItems.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPriceYuan: fenToYuan(item.unitPriceAmount),
    })),
    reviewStatus: product.reviewStatus,
    reviewStatusLabel: product.reviewStatusLabel,
    saleStatus: product.saleStatus,
    saleStatusLabel: product.saleStatusLabel,
    rejectionReason: product.rejectionReason,
  };
}

export function toVoucherUpdateRequest(
  form: VoucherDraftForm,
): MerchantVoucherProductUpdateRequest {
  validateUsageRules(form.usageRules);
  return {
    version: form.version,
    title: optionalText(form.title),
    subTitle: optionalText(form.subTitle),
    coverMediaId: form.coverMedia?.id,
    detailMediaIds: form.detailMedia.map((media) => media.id),
    priceAmount: optionalFen(form.priceYuan, "售价"),
    marketAmount: optionalFen(form.marketYuan, "门市价"),
    faceValueAmount:
      form.productType === "CASH"
        ? optionalFen(form.faceValueYuan, "抵扣额")
        : undefined,
    minimumSpendAmount:
      form.productType === "CASH" || form.productType === "DISCOUNT"
        ? optionalFen(form.minimumSpendYuan, "最低消费")
        : undefined,
    discountRateBps:
      form.productType === "DISCOUNT"
        ? optionalDiscountBps(form.discountRate)
        : undefined,
    maximumDiscountAmount:
      form.productType === "DISCOUNT"
        ? optionalFen(form.maximumDiscountYuan, "最高优惠")
        : undefined,
    totalUseCount:
      form.productType === "MULTI_USE"
        ? optionalIntegerValue(form.totalUseCount, "总次数")
        : undefined,
    totalStock: integerValue(form.totalStock, "总库存"),
    purchaseLimit: integerValue(form.purchaseLimit, "限购数量"),
    saleBeginTime: optionalText(form.saleBeginTime),
    saleEndTime: optionalText(form.saleEndTime),
    validityType: form.validityType,
    validBeginTime:
      form.validityType === "FIXED_RANGE"
        ? optionalText(form.validBeginTime)
        : undefined,
    validEndTime:
      form.validityType === "FIXED_RANGE"
        ? optionalText(form.validEndTime)
        : undefined,
    validDays:
      form.validityType === "DAYS_AFTER_PURCHASE"
        ? optionalIntegerValue(form.validDays, "有效天数")
        : undefined,
    usageRules: clone(form.usageRules),
    excludedDates: [...form.excludedDates],
    reservationRequired: form.reservationRequired,
    reservationNotice: form.reservationRequired
      ? optionalText(form.reservationNotice)
      : undefined,
    stackable: form.stackable,
    refundAnytime: form.refundAnytime,
    refundExpired: form.refundExpired,
    packageItems:
      form.productType === "PACKAGE" || form.productType === "MULTI_USE"
        ? form.packageItems.map((item) => ({
            name: item.name.trim(),
            quantity: integerValue(item.quantity, "明细数量"),
            unit: item.unit.trim(),
            unitPriceAmount: optionalFen(item.unitPriceYuan, "明细门市价"),
          }))
        : [],
  };
}

export function defaultUsageRules() {
  return businessDays.map((day) => ({
    dayOfWeek: day,
    closed: false,
    periods: [{ open: "10:00", close: "22:00" }],
  }));
}

export function fenToYuan(value?: number): string {
  if (value == null) return "";
  return formatDecimal(value / 100);
}

export function yuanToFen(value: string, label = "金额"): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new ApiError(`${label}最多保留两位小数`, 400, "FORM_INVALID");
  }
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount)) {
    throw new ApiError(`${label}超出可填写范围`, 400, "FORM_INVALID");
  }
  return amount;
}

export function discountRateToBps(value: string): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new ApiError("折扣请输入0.1至9.9", 400, "FORM_INVALID");
  }
  return Math.round(Number(value) * 1000);
}

export function validateUsageRules(
  rules: VoucherDraftForm["usageRules"],
): void {
  const days = new Set<string>();
  for (const rule of rules) {
    if (days.has(rule.dayOfWeek)) {
      throw new ApiError("同一星期不能重复配置", 400, "FORM_INVALID");
    }
    days.add(rule.dayOfWeek);
    if (rule.periods.length > 3) {
      throw new ApiError("每天最多配置三个时段", 400, "FORM_INVALID");
    }
    if (rule.closed && rule.periods.length > 0) {
      throw new ApiError("休息日不能保留使用时段", 400, "FORM_INVALID");
    }
    const sorted = [...rule.periods].sort((left, right) =>
      left.open.localeCompare(right.open),
    );
    sorted.forEach((period, index) => {
      if (
        !time(period.open) ||
        !time(period.close) ||
        period.open >= period.close
      ) {
        throw new ApiError(
          "使用时段的开始时间必须早于结束时间",
          400,
          "FORM_INVALID",
        );
      }
      const previous = sorted[index - 1];
      if (previous && previous.close > period.open) {
        throw new ApiError("同一天的使用时段不能重叠", 400, "FORM_INVALID");
      }
    });
  }
}

function optionalIntegerValue(
  value: string,
  label: string,
): number | undefined {
  return value.trim() ? integerValue(value, label) : undefined;
}

function integerValue(value: string, label: string): number {
  if (!/^\d+$/.test(value.trim())) {
    throw new ApiError(`${label}必须为整数`, 400, "FORM_INVALID");
  }
  return Number(value);
}

function optionalInteger(value?: number): string {
  return value == null ? "" : String(value);
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function formatDecimal(value: number): string {
  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function newIdempotencyKey(): string {
  return `voucher-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function cloneForm(value: VoucherDraftForm): VoucherDraftForm {
  return clone(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function optionalFen(value: string, label: string): number | undefined {
  return yuanToFen(value, label);
}

function optionalDiscountBps(value: string): number | undefined {
  return discountRateToBps(value);
}

function time(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export const voucherDraftStore = new VoucherDraftStore();
