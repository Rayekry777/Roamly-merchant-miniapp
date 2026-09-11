export const merchantApplicationStatuses = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type MerchantApplicationStatus =
  (typeof merchantApplicationStatuses)[number];

export const businessDays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type BusinessDayOfWeek = (typeof businessDays)[number];

export type BusinessMediaPurpose =
  | "LICENSE"
  | "GALLERY"
  | "VOUCHER_COVER"
  | "VOUCHER_DETAIL"
  | "MERCHANT_AVATAR";

export interface BusinessPeriod {
  open: string;
  close: string;
}

export interface BusinessDayHours {
  dayOfWeek: BusinessDayOfWeek;
  closed: boolean;
  periods: BusinessPeriod[];
}

export interface BusinessMedia {
  id: string;
  purpose: BusinessMediaPurpose;
  purposeLabel: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  contentPath: string;
  expiresAt?: string;
  localPath?: string;
}

export interface MerchantApplication {
  id: string;
  status: MerchantApplicationStatus;
  statusLabel: string;
  shopName?: string;
  licenseNumber?: string;
  legalRepresentative?: string;
  contactName?: string;
  contactPhone?: string;
  shopTypeId?: string;
  cityCode?: string;
  district?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  businessHours: BusinessDayHours[];
  licenseMedia?: BusinessMedia;
  galleryMedia: BusinessMedia[];
  settlementAccountName?: string;
  settlementBankName?: string;
  settlementAccountSuffix?: string;
  rejectionReason?: string;
  version: number;
  submittedAt?: string;
  reviewedAt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface MerchantApplicationDraft {
  version: number;
  shopName: string;
  licenseNumber: string;
  legalRepresentative: string;
  contactName: string;
  contactPhone: string;
  shopTypeId: string;
  cityCode: string;
  district: string;
  address: string;
  longitude?: number;
  latitude?: number;
  businessHours: BusinessDayHours[];
  licenseMedia?: BusinessMedia;
  galleryMedia: BusinessMedia[];
  settlementAccountName: string;
  settlementBankName: string;
  settlementAccountSuffix: string;
}

export interface MerchantApplicationSaveRequest {
  version: number;
  shopName?: string;
  licenseNumber?: string;
  legalRepresentative?: string;
  contactName?: string;
  contactPhone?: string;
  shopTypeId?: string;
  cityCode?: string;
  district?: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  businessHours: BusinessDayHours[];
  licenseMediaId?: string;
  galleryMediaIds: string[];
  settlementAccountName?: string;
  settlementBankName?: string;
  settlementAccountSuffix?: string;
}

export interface MerchantCity {
  code: string;
  name: string;
}

export interface MerchantShopType {
  id: string;
  name: string;
  icon?: string;
  sort?: number;
}
