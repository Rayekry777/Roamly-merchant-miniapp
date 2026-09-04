import {
  getMerchantApplication,
  listMerchantCities,
  listMerchantShopTypes,
  saveMerchantApplication,
  submitMerchantApplication,
} from "../api/merchant-application";
import type {
  BusinessDayHours,
  MerchantApplication,
  MerchantApplicationDraft,
  MerchantApplicationSaveRequest,
  MerchantCity,
  MerchantShopType,
} from "../types/merchant-application";
import { businessDays } from "../types/merchant-application";

const dayLabels = [
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
  "星期日",
] as const;

export const businessDayLabels = Object.freeze(
  Object.fromEntries(
    businessDays.map((day, index) => [day, dayLabels[index]]),
  ) as Record<(typeof businessDays)[number], string>,
);

class OnboardingStore {
  application: MerchantApplication | null = null;
  draft: MerchantApplicationDraft = emptyDraft();
  cities: MerchantCity[] = [];
  shopTypes: MerchantShopType[] = [];
  private submissionKey = "";

  async load(): Promise<MerchantApplicationDraft> {
    const [application, cities, shopTypes] = await Promise.all([
      getMerchantApplication(),
      listMerchantCities(),
      listMerchantShopTypes(),
    ]);
    this.application = application;
    this.cities = cities;
    this.shopTypes = shopTypes;
    this.draft = application ? draftFromApplication(application) : emptyDraft();
    return cloneDraft(this.draft);
  }

  replaceDraft(value: MerchantApplicationDraft): void {
    this.draft = cloneDraft(value);
    this.submissionKey = "";
  }

  async save(
    value: MerchantApplicationDraft,
  ): Promise<MerchantApplicationDraft> {
    const application = await saveMerchantApplication(toSaveRequest(value));
    this.application = application;
    this.draft = draftFromApplication(application);
    this.submissionKey = "";
    return cloneDraft(this.draft);
  }

  async submit(): Promise<MerchantApplication> {
    if (!this.submissionKey) this.submissionKey = newIdempotencyKey();
    const application = await submitMerchantApplication(this.submissionKey);
    this.application = application;
    this.draft = draftFromApplication(application);
    return application;
  }

  clearSubmissionKey(): void {
    this.submissionKey = "";
  }
}

export function emptyDraft(): MerchantApplicationDraft {
  const hours: BusinessDayHours[] = businessDays.map((day, index) => ({
    dayOfWeek: day,
    closed: index === 6,
    periods: index === 6 ? [] : [{ open: "09:00", close: "21:00" }],
  }));
  return {
    version: 0,
    shopName: "",
    licenseNumber: "",
    legalRepresentative: "",
    contactName: "",
    contactPhone: "",
    shopTypeId: "",
    cityCode: "",
    district: "",
    address: "",
    businessHours: hours,
    galleryMedia: [],
    settlementAccountName: "",
    settlementBankName: "Roamly Mock 银行",
    settlementAccountSuffix: "",
  };
}

export function draftFromApplication(
  application: MerchantApplication,
): MerchantApplicationDraft {
  return {
    version: application.version,
    shopName: application.shopName ?? "",
    licenseNumber: application.licenseNumber ?? "",
    legalRepresentative: application.legalRepresentative ?? "",
    contactName: application.contactName ?? "",
    contactPhone: application.contactPhone ?? "",
    shopTypeId: application.shopTypeId ?? "",
    cityCode: application.cityCode ?? "",
    district: application.district ?? "",
    address: application.address ?? "",
    longitude: application.longitude,
    latitude: application.latitude,
    businessHours:
      application.businessHours.length > 0
        ? application.businessHours
        : emptyDraft().businessHours,
    licenseMedia: application.licenseMedia,
    galleryMedia: application.galleryMedia,
    settlementAccountName: application.settlementAccountName ?? "",
    settlementBankName: application.settlementBankName ?? "Roamly Mock 银行",
    settlementAccountSuffix: application.settlementAccountSuffix ?? "",
  };
}

export function toSaveRequest(
  draft: MerchantApplicationDraft,
): MerchantApplicationSaveRequest {
  return {
    version: draft.version,
    shopName: text(draft.shopName),
    licenseNumber: text(draft.licenseNumber),
    legalRepresentative: text(draft.legalRepresentative),
    contactName: text(draft.contactName),
    contactPhone: text(draft.contactPhone),
    shopTypeId: text(draft.shopTypeId),
    cityCode: text(draft.cityCode),
    district: text(draft.district),
    address: text(draft.address),
    longitude: draft.longitude,
    latitude: draft.latitude,
    businessHours: draft.businessHours.map((day) => ({
      ...day,
      periods: day.periods.map((period) => ({ ...period })),
    })),
    licenseMediaId: draft.licenseMedia?.id,
    galleryMediaIds: draft.galleryMedia.map((media) => media.id),
    settlementAccountName: text(draft.settlementAccountName),
    settlementBankName: text(draft.settlementBankName),
    settlementAccountSuffix: text(draft.settlementAccountSuffix),
  };
}

export function cloneDraft(
  draft: MerchantApplicationDraft,
): MerchantApplicationDraft {
  return {
    ...draft,
    businessHours: draft.businessHours.map((day) => ({
      ...day,
      periods: day.periods.map((period) => ({ ...period })),
    })),
    licenseMedia: draft.licenseMedia ? { ...draft.licenseMedia } : undefined,
    galleryMedia: draft.galleryMedia.map((media) => ({ ...media })),
  };
}

function text(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function newIdempotencyKey(): string {
  return `merchant-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const onboardingStore = new OnboardingStore();
