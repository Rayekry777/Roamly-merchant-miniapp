import type { BusinessDayHours, BusinessMedia } from "./merchant-application";

export const voucherProductTypes = [
  "PACKAGE",
  "CASH",
  "DISCOUNT",
  "MULTI_USE",
] as const;
export type VoucherProductType = (typeof voucherProductTypes)[number];

export const voucherReviewStatuses = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type VoucherReviewStatus = (typeof voucherReviewStatuses)[number];

export const voucherSaleStatuses = [
  "SCHEDULED",
  "ON_SALE",
  "OFF_SALE",
  "SOLD_OUT",
  "ENDED",
] as const;
export type VoucherSaleStatus = (typeof voucherSaleStatuses)[number];

export const voucherValidityTypes = [
  "FIXED_RANGE",
  "DAYS_AFTER_PURCHASE",
] as const;
export type VoucherValidityType = (typeof voucherValidityTypes)[number];

export const voucherTypeLabels: Record<VoucherProductType, string> = {
  PACKAGE: "套餐券",
  CASH: "代金券",
  DISCOUNT: "折扣券",
  MULTI_USE: "次卡",
};

export const voucherReviewLabels: Record<VoucherReviewStatus, string> = {
  DRAFT: "草稿",
  PENDING: "审核中",
  APPROVED: "审核通过",
  REJECTED: "审核未通过",
};

export const voucherSaleLabels: Record<VoucherSaleStatus, string> = {
  SCHEDULED: "待开售",
  ON_SALE: "销售中",
  OFF_SALE: "已下架",
  SOLD_OUT: "已售罄",
  ENDED: "已结束",
};

export interface MerchantVoucherPackageItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceAmount?: number;
  sortOrder: number;
}

export interface MerchantVoucherProduct {
  id: string;
  shopId: string;
  productType: VoucherProductType;
  productTypeLabel: string;
  title?: string;
  subTitle?: string;
  coverMediaId?: string;
  coverMedia?: BusinessMedia;
  detailMediaIds: string[];
  detailMedia: BusinessMedia[];
  priceAmount?: number;
  marketAmount?: number;
  faceValueAmount?: number;
  minimumSpendAmount?: number;
  discountRateBps?: number;
  maximumDiscountAmount?: number;
  totalUseCount?: number;
  totalStock: number;
  availableStock: number;
  soldCount: number;
  purchaseLimit: number;
  saleBeginTime?: string;
  saleEndTime?: string;
  validityType?: VoucherValidityType;
  validityTypeLabel?: string;
  validBeginTime?: string;
  validEndTime?: string;
  validDays?: number;
  usageRules: BusinessDayHours[];
  excludedDates: string[];
  reservationRequired: boolean;
  reservationNotice?: string;
  stackable: boolean;
  refundAnytime: boolean;
  refundExpired: boolean;
  packageItems: MerchantVoucherPackageItem[];
  reviewStatus: VoucherReviewStatus;
  reviewStatusLabel: string;
  saleStatus?: VoucherSaleStatus;
  saleStatusLabel?: string;
  rejectionReason?: string;
  submittedAt?: string;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface MerchantVoucherProductUpdateRequest {
  version: number;
  title?: string;
  subTitle?: string;
  coverMediaId?: string;
  detailMediaIds: string[];
  priceAmount?: number;
  marketAmount?: number;
  faceValueAmount?: number;
  minimumSpendAmount?: number;
  discountRateBps?: number;
  maximumDiscountAmount?: number;
  totalUseCount?: number;
  totalStock: number;
  purchaseLimit: number;
  saleBeginTime?: string;
  saleEndTime?: string;
  validityType?: VoucherValidityType;
  validBeginTime?: string;
  validEndTime?: string;
  validDays?: number;
  usageRules: BusinessDayHours[];
  excludedDates: string[];
  reservationRequired: boolean;
  reservationNotice?: string;
  stackable: boolean;
  refundAnytime: boolean;
  refundExpired: boolean;
  packageItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPriceAmount?: number;
  }>;
}

export interface VoucherPackageItemDraft {
  name: string;
  quantity: string;
  unit: string;
  unitPriceYuan: string;
}

export interface VoucherDraftForm {
  id: string;
  productType: VoucherProductType;
  version: number;
  title: string;
  subTitle: string;
  coverMedia?: BusinessMedia;
  detailMedia: BusinessMedia[];
  priceYuan: string;
  marketYuan: string;
  faceValueYuan: string;
  minimumSpendYuan: string;
  discountRate: string;
  maximumDiscountYuan: string;
  totalUseCount: string;
  totalStock: string;
  purchaseLimit: string;
  saleBeginTime: string;
  saleEndTime: string;
  validityType: VoucherValidityType;
  validBeginTime: string;
  validEndTime: string;
  validDays: string;
  usageRules: BusinessDayHours[];
  excludedDates: string[];
  reservationRequired: boolean;
  reservationNotice: string;
  stackable: boolean;
  refundAnytime: boolean;
  refundExpired: boolean;
  packageItems: VoucherPackageItemDraft[];
  reviewStatus: VoucherReviewStatus;
  reviewStatusLabel: string;
  saleStatus?: VoucherSaleStatus;
  saleStatusLabel?: string;
  rejectionReason?: string;
}
