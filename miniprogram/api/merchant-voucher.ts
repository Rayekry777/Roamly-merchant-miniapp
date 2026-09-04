import {
  parseBusinessMedia,
  uploadBusinessImage,
} from "./merchant-application";
import type { PageResult } from "../types/http";
import { businessDays } from "../types/merchant-application";
import {
  voucherProductTypes,
  voucherReviewStatuses,
  voucherSaleStatuses,
  voucherValidityTypes,
} from "../types/voucher";
import type {
  MerchantVoucherPackageItem,
  MerchantVoucherProduct,
  MerchantVoucherProductUpdateRequest,
  VoucherProductType,
  VoucherReviewStatus,
} from "../types/voucher";
import { ApiError, request } from "../utils/request";

type UnknownRecord = Record<string, unknown>;

export async function listMerchantVoucherProducts(filters: {
  reviewStatus?: VoucherReviewStatus;
  productType?: VoucherProductType;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResult<MerchantVoucherProduct>> {
  const params: string[] = [];
  if (filters.reviewStatus) {
    params.push(`reviewStatus=${encodeURIComponent(filters.reviewStatus)}`);
  }
  if (filters.productType) {
    params.push(`productType=${encodeURIComponent(filters.productType)}`);
  }
  if (filters.keyword?.trim()) {
    params.push(`keyword=${encodeURIComponent(filters.keyword.trim())}`);
  }
  params.push(`page=${filters.page ?? 1}`, `size=${filters.size ?? 20}`);
  const result = await request<PageResult<MerchantVoucherProduct>>(
    `/v1/merchant/voucher-products?${params.join("&")}`,
    { showError: false },
  );
  return parseVoucherPage(result.data);
}

export async function createMerchantVoucherProduct(
  productType: VoucherProductType,
): Promise<MerchantVoucherProduct> {
  const result = await request<
    MerchantVoucherProduct,
    { productType: VoucherProductType }
  >("/v1/merchant/voucher-products", {
    method: "POST",
    data: { productType },
    showError: false,
  });
  return parseVoucherProduct(result.data);
}

export async function getMerchantVoucherProduct(
  productId: string,
): Promise<MerchantVoucherProduct> {
  const result = await request<MerchantVoucherProduct>(
    `/v1/merchant/voucher-products/${productId}`,
    { showError: false },
  );
  return parseVoucherProduct(result.data);
}

export async function updateMerchantVoucherProduct(
  productId: string,
  value: MerchantVoucherProductUpdateRequest,
): Promise<MerchantVoucherProduct> {
  const result = await request<
    MerchantVoucherProduct,
    MerchantVoucherProductUpdateRequest
  >(`/v1/merchant/voucher-products/${productId}`, {
    method: "PUT",
    data: value,
    showError: false,
  });
  return parseVoucherProduct(result.data);
}

export async function deleteMerchantVoucherProduct(
  productId: string,
): Promise<void> {
  await request<null>(`/v1/merchant/voucher-products/${productId}`, {
    method: "DELETE",
    showError: false,
  });
}

export async function copyMerchantVoucherProduct(
  productId: string,
): Promise<MerchantVoucherProduct> {
  const result = await request<MerchantVoucherProduct>(
    `/v1/merchant/voucher-products/${productId}/copies`,
    { method: "POST", showError: false },
  );
  return parseVoucherProduct(result.data);
}

export async function submitMerchantVoucherProduct(
  productId: string,
  version: number,
  idempotencyKey: string,
): Promise<MerchantVoucherProduct> {
  const result = await request<MerchantVoucherProduct, { version: number }>(
    `/v1/merchant/voucher-products/${productId}/submission`,
    {
      method: "POST",
      data: { version },
      headers: { "Idempotency-Key": idempotencyKey },
      showError: false,
    },
  );
  return parseVoucherProduct(result.data);
}

export async function uploadVoucherImage(
  filePath: string,
  purpose: "VOUCHER_COVER" | "VOUCHER_DETAIL",
) {
  return uploadBusinessImage(filePath, purpose);
}

export function parseVoucherPage(
  value: unknown,
): PageResult<MerchantVoucherProduct> {
  const page = record(value);
  if (
    !Array.isArray(page.items) ||
    !safeInteger(page.page) ||
    !safeInteger(page.size) ||
    !safeInteger(page.total)
  ) {
    throw contractError();
  }
  return {
    items: page.items.map(parseVoucherProduct),
    page: page.page,
    size: page.size,
    total: page.total,
  };
}

export function parseVoucherProduct(value: unknown): MerchantVoucherProduct {
  const item = record(value);
  if (
    !nonEmptyString(item.id) ||
    !nonEmptyString(item.shopId) ||
    !voucherProductTypes.includes(item.productType as VoucherProductType) ||
    !nonEmptyString(item.productTypeLabel) ||
    !Array.isArray(item.detailMediaIds) ||
    !Array.isArray(item.detailMedia) ||
    !Array.isArray(item.usageRules) ||
    !Array.isArray(item.excludedDates) ||
    !Array.isArray(item.packageItems) ||
    !voucherReviewStatuses.includes(item.reviewStatus as VoucherReviewStatus) ||
    !nonEmptyString(item.reviewStatusLabel) ||
    !safeInteger(item.totalStock) ||
    !safeInteger(item.availableStock) ||
    !safeInteger(item.soldCount) ||
    !safeInteger(item.purchaseLimit) ||
    typeof item.reservationRequired !== "boolean" ||
    typeof item.stackable !== "boolean" ||
    typeof item.refundAnytime !== "boolean" ||
    typeof item.refundExpired !== "boolean" ||
    !safeInteger(item.version)
  ) {
    throw contractError();
  }
  if (!item.detailMediaIds.every(nonEmptyString)) throw contractError();
  if (!item.excludedDates.every(nonEmptyString)) throw contractError();
  if (
    item.validityType != null &&
    !voucherValidityTypes.includes(item.validityType as never)
  ) {
    throw contractError();
  }
  if (
    item.saleStatus != null &&
    !voucherSaleStatuses.includes(item.saleStatus as never)
  ) {
    throw contractError();
  }
  const usageRules = item.usageRules.map(parseDay);
  const packageItems = item.packageItems.map(parsePackageItem);
  const detailMedia = item.detailMedia.map(parseBusinessMedia);
  const coverMedia =
    item.coverMedia == null ? undefined : parseBusinessMedia(item.coverMedia);
  const result: MerchantVoucherProduct = {
    id: item.id,
    shopId: item.shopId,
    productType: item.productType as VoucherProductType,
    productTypeLabel: item.productTypeLabel,
    detailMediaIds: item.detailMediaIds as string[],
    detailMedia,
    totalStock: item.totalStock,
    availableStock: item.availableStock,
    soldCount: item.soldCount,
    purchaseLimit: item.purchaseLimit,
    usageRules,
    excludedDates: item.excludedDates as string[],
    reservationRequired: item.reservationRequired,
    stackable: item.stackable,
    refundAnytime: item.refundAnytime,
    refundExpired: item.refundExpired,
    packageItems,
    reviewStatus: item.reviewStatus as VoucherReviewStatus,
    reviewStatusLabel: item.reviewStatusLabel,
    version: item.version,
  };
  assignOptionalStrings(result, item, [
    "title",
    "subTitle",
    "coverMediaId",
    "validityTypeLabel",
    "saleBeginTime",
    "saleEndTime",
    "validBeginTime",
    "validEndTime",
    "reservationNotice",
    "saleStatusLabel",
    "rejectionReason",
    "submittedAt",
    "createTime",
    "updateTime",
  ]);
  assignOptionalNumbers(result, item, [
    "priceAmount",
    "marketAmount",
    "faceValueAmount",
    "minimumSpendAmount",
    "discountRateBps",
    "maximumDiscountAmount",
    "totalUseCount",
    "validDays",
  ]);
  if (item.validityType != null) {
    result.validityType =
      item.validityType as MerchantVoucherProduct["validityType"];
  }
  if (item.saleStatus != null) {
    result.saleStatus = item.saleStatus as MerchantVoucherProduct["saleStatus"];
  }
  if (coverMedia) result.coverMedia = coverMedia;
  return result;
}

function parsePackageItem(value: unknown): MerchantVoucherPackageItem {
  const item = record(value);
  if (
    !nonEmptyString(item.id) ||
    !nonEmptyString(item.name) ||
    !nonEmptyString(item.unit) ||
    !safeInteger(item.quantity) ||
    !safeInteger(item.sortOrder) ||
    (item.unitPriceAmount != null && !safeInteger(item.unitPriceAmount))
  ) {
    throw contractError();
  }
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceAmount:
      typeof item.unitPriceAmount === "number"
        ? item.unitPriceAmount
        : undefined,
    sortOrder: item.sortOrder,
  };
}

function parseDay(value: unknown) {
  const item = record(value);
  if (
    !businessDays.includes(item.dayOfWeek as never) ||
    typeof item.closed !== "boolean" ||
    !Array.isArray(item.periods)
  ) {
    throw contractError();
  }
  return {
    dayOfWeek:
      item.dayOfWeek as import("../types/merchant-application").BusinessDayOfWeek,
    closed: item.closed,
    periods: item.periods.map((value) => {
      const period = record(value);
      if (!nonEmptyString(period.open) || !nonEmptyString(period.close)) {
        throw contractError();
      }
      return { open: period.open, close: period.close };
    }),
  };
}

function assignOptionalStrings(
  target: MerchantVoucherProduct,
  source: UnknownRecord,
  fields: string[],
): void {
  fields.forEach((field) => {
    const value = source[field];
    if (value == null) return;
    if (typeof value !== "string") throw contractError();
    Object.assign(target, { [field]: value });
  });
}

function assignOptionalNumbers(
  target: MerchantVoucherProduct,
  source: UnknownRecord,
  fields: string[],
): void {
  fields.forEach((field) => {
    const value = source[field];
    if (value == null) return;
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw contractError();
    }
    Object.assign(target, { [field]: value });
  });
}

function record(value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw contractError();
  }
  return value as UnknownRecord;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function safeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function contractError(): ApiError {
  return new ApiError("团购券响应格式异常", 200, "RESPONSE_CONTRACT_INVALID");
}
