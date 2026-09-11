import type {
  BusinessDayHours,
  BusinessDayOfWeek,
  BusinessMedia,
  BusinessMediaPurpose,
  MerchantApplication,
  MerchantApplicationSaveRequest,
  MerchantApplicationStatus,
  MerchantCity,
  MerchantShopType,
} from "../types/merchant-application";
import {
  businessDays,
  merchantApplicationStatuses,
} from "../types/merchant-application";
import {
  ApiError,
  downloadPrivateFile,
  request,
  uploadFile,
} from "../utils/request";

type UnknownRecord = Record<string, unknown>;

export async function getMerchantApplication(): Promise<MerchantApplication | null> {
  const result = await request<MerchantApplication | null>(
    "/v1/merchant/application",
    { showError: false },
  );
  return result.data === null ? null : parseApplication(result.data);
}

export async function saveMerchantApplication(
  value: MerchantApplicationSaveRequest,
): Promise<MerchantApplication> {
  const result = await request<
    MerchantApplication,
    MerchantApplicationSaveRequest
  >("/v1/merchant/application", {
    method: "PUT",
    data: value,
    showError: false,
  });
  return parseApplication(result.data);
}

export async function submitMerchantApplication(
  idempotencyKey: string,
): Promise<MerchantApplication> {
  const result = await request<MerchantApplication>(
    "/v1/merchant/application/submission",
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      showError: false,
    },
  );
  return parseApplication(result.data);
}

export async function listMerchantCities(): Promise<MerchantCity[]> {
  const result = await request<MerchantCity[]>(
    "/v1/merchant/reference/cities",
    { showError: false },
  );
  if (!Array.isArray(result.data)) throw contractError();
  return result.data.map(parseCity);
}

export async function listMerchantShopTypes(): Promise<MerchantShopType[]> {
  const result = await request<MerchantShopType[]>(
    "/v1/merchant/reference/shop-types",
    { showError: false },
  );
  if (!Array.isArray(result.data)) throw contractError();
  return result.data.map(parseShopType);
}

export async function uploadBusinessImage(
  filePath: string,
  purpose: BusinessMediaPurpose,
): Promise<BusinessMedia> {
  const value = await uploadFile<BusinessMedia>(
    "/v1/merchant/business-media/images",
    filePath,
    { purpose },
  );
  return { ...parseBusinessMedia(value), localPath: filePath };
}

export async function deleteBusinessImage(mediaId: string): Promise<void> {
  await request<null>(`/v1/merchant/business-media/images/${mediaId}`, {
    method: "DELETE",
    showError: false,
  });
}

export function downloadBusinessImage(media: BusinessMedia): Promise<string> {
  return downloadPrivateFile(media.contentPath);
}

export function parseApplication(value: unknown): MerchantApplication {
  const item = record(value);
  if (
    !string(item.id) ||
    !applicationStatus(item.status) ||
    !string(item.statusLabel) ||
    typeof item.version !== "number" ||
    !Array.isArray(item.businessHours) ||
    !Array.isArray(item.galleryMedia)
  ) {
    throw contractError();
  }
  const result = {
    ...item,
    businessHours: item.businessHours.map(parseDay),
    galleryMedia: item.galleryMedia.map(parseBusinessMedia),
  } as unknown as MerchantApplication;
  if (item.licenseMedia !== undefined) {
    result.licenseMedia = parseBusinessMedia(item.licenseMedia);
  }
  optionalStrings(item, [
    "shopName",
    "licenseNumber",
    "legalRepresentative",
    "contactName",
    "contactPhone",
    "shopTypeId",
    "cityCode",
    "district",
    "address",
    "settlementAccountName",
    "settlementBankName",
    "settlementAccountSuffix",
    "rejectionReason",
    "submittedAt",
    "reviewedAt",
    "createTime",
    "updateTime",
  ]);
  if (item.longitude !== undefined && typeof item.longitude !== "number") {
    throw contractError();
  }
  if (item.latitude !== undefined && typeof item.latitude !== "number") {
    throw contractError();
  }
  return result;
}

export function parseBusinessMedia(value: unknown): BusinessMedia {
  const item = record(value);
  if (
    !string(item.id) ||
    !mediaPurpose(item.purpose) ||
    !string(item.purposeLabel) ||
    !string(item.originalFilename) ||
    !string(item.mimeType) ||
    typeof item.byteSize !== "number" ||
    typeof item.width !== "number" ||
    typeof item.height !== "number" ||
    !string(item.contentPath)
  ) {
    throw contractError();
  }
  if (item.expiresAt !== undefined && typeof item.expiresAt !== "string") {
    throw contractError();
  }
  return item as unknown as BusinessMedia;
}

function parseDay(value: unknown): BusinessDayHours {
  const item = record(value);
  if (
    !dayOfWeek(item.dayOfWeek) ||
    typeof item.closed !== "boolean" ||
    !Array.isArray(item.periods)
  ) {
    throw contractError();
  }
  const periods = item.periods.map((value) => {
    const period = record(value);
    if (!string(period.open) || !string(period.close)) throw contractError();
    return { open: period.open, close: period.close };
  });
  return { dayOfWeek: item.dayOfWeek, closed: item.closed, periods };
}

function parseCity(value: unknown): MerchantCity {
  const item = record(value);
  if (!string(item.code) || !string(item.name)) throw contractError();
  return item as unknown as MerchantCity;
}

function parseShopType(value: unknown): MerchantShopType {
  const item = record(value);
  if (!string(item.id) || !string(item.name)) throw contractError();
  if (item.icon !== undefined && typeof item.icon !== "string") {
    throw contractError();
  }
  if (item.sort !== undefined && typeof item.sort !== "number") {
    throw contractError();
  }
  return item as unknown as MerchantShopType;
}

function record(value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw contractError();
  }
  return value as UnknownRecord;
}

function optionalStrings(value: UnknownRecord, fields: string[]): void {
  fields.forEach((field) => {
    if (value[field] !== undefined && typeof value[field] !== "string") {
      throw contractError();
    }
  });
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function applicationStatus(value: unknown): value is MerchantApplicationStatus {
  return merchantApplicationStatuses.includes(
    value as MerchantApplicationStatus,
  );
}

function mediaPurpose(value: unknown): value is BusinessMediaPurpose {
  return (
    value === "LICENSE" ||
    value === "GALLERY" ||
    value === "VOUCHER_COVER" ||
    value === "VOUCHER_DETAIL" ||
    value === "MERCHANT_AVATAR"
  );
}

function dayOfWeek(value: unknown): value is BusinessDayOfWeek {
  return businessDays.includes(value as BusinessDayOfWeek);
}

function contractError(): ApiError {
  return new ApiError("入驻资料响应格式异常", 200, "RESPONSE_CONTRACT_INVALID");
}
