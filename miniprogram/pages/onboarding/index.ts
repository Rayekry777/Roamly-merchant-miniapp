import {
  deleteBusinessImage,
  downloadBusinessImage,
  uploadBusinessImage,
} from "../../api/merchant-application";
import {
  businessDayLabels,
  cloneDraft,
  onboardingStore,
} from "../../store/onboarding";
import type {
  BusinessMedia,
  MerchantApplicationDraft,
} from "../../types/merchant-application";
import { ApiError } from "../../utils/request";
import { editImageForUpload } from "../../utils/image";

const steps = ["主体", "门店", "营业", "结算"];

Page({
  data: {
    loading: true,
    saving: false,
    uploading: false,
    currentStep: 0,
    steps,
    draft: null as MerchantApplicationDraft | null,
    businessHoursView: [] as Array<Record<string, unknown>>,
    cities: [] as Array<{ code: string; name: string }>,
    shopTypes: [] as Array<{ id: string; name: string }>,
    rootTypes: [] as Array<{ id: string; name: string }>,
    rootTypeNames: [] as string[],
    rootTypeIndex: -1,
    cityNames: [] as string[],
    shopTypeNames: [] as string[],
    cityIndex: -1,
    shopTypeIndex: -1,
    readonly: false,
    statusLabel: "",
    rejectionReason: "",
    error: "",
  },
  onLoad() {
    void this.load();
  },
  async load() {
    this.setData({ loading: true, error: "" });
    try {
      const draft = await onboardingStore.load();
      const application = onboardingStore.application;
      this.setDraftData(draft, {
        readonly: application?.status === "PENDING",
        statusLabel: application?.statusLabel ?? "草稿",
        rejectionReason: application?.rejectionReason ?? "",
      });
      void this.loadPrivatePreviews(draft);
    } catch (error) {
      this.setData({ error: message(error) });
    } finally {
      this.setData({ loading: false });
    }
  },
  setDraftData(
    draft: MerchantApplicationDraft,
    extra: Record<string, unknown> = {},
  ) {
    const cityIndex = onboardingStore.cities.findIndex(
      (city) => city.code === draft.cityCode,
    );
    const selectedType = onboardingStore.shopTypes.find(
      (type) => type.id === draft.shopTypeId,
    );
    const rootTypes = onboardingStore.shopTypes.filter(
      (type) => !type.parentId,
    );
    const rootTypeIndex = rootTypes.findIndex(
      (type) => type.id === (selectedType?.parentId || selectedType?.id),
    );
    const shopTypes = onboardingStore.shopTypes.filter(
      (type) =>
        type.parentId === rootTypes[rootTypeIndex]?.id &&
        Boolean(type.parentId),
    );
    const shopTypeIndex = shopTypes.findIndex(
      (type) => type.id === draft.shopTypeId,
    );
    this.setData({
      draft: cloneDraft(draft),
      businessHoursView: draft.businessHours.map((day) => ({
        ...day,
        label: businessDayLabels[day.dayOfWeek],
      })),
      cities: onboardingStore.cities,
      shopTypes,
      rootTypes,
      rootTypeIndex,
      rootTypeNames: rootTypes.map((type) => type.name),
      cityNames: onboardingStore.cities.map((city) => city.name),
      shopTypeNames: shopTypes.map((type) => type.name),
      cityIndex,
      shopTypeIndex,
      ...extra,
    });
  },
  async loadPrivatePreviews(draft: MerchantApplicationDraft) {
    const media = [draft.licenseMedia, ...draft.galleryMedia].filter(
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
    this.setDraftData(draft);
  },
  onFieldInput(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({ [`draft.${field}`]: event.detail.value });
    onboardingStore.clearSubmissionKey();
  },
  onCityChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const city = this.data.cities[index];
    if (!city) return;
    this.setData({ cityIndex: index, "draft.cityCode": city.code });
    onboardingStore.clearSubmissionKey();
  },
  onRootTypeChange(event: WechatMiniprogram.PickerChange) {
    const rootTypeIndex = Number(event.detail.value);
    const root = this.data.rootTypes[rootTypeIndex];
    if (!root) return;
    const shopTypes = onboardingStore.shopTypes.filter(
      (type) => type.parentId === root.id,
    );
    this.setData({
      rootTypeIndex,
      shopTypes,
      shopTypeNames: shopTypes.map((type) => type.name),
      shopTypeIndex: -1,
      "draft.shopTypeId": "",
    });
    onboardingStore.clearSubmissionKey();
  },
  onShopTypeChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.detail.value);
    const type = this.data.shopTypes[index];
    if (!type) return;
    this.setData({ shopTypeIndex: index, "draft.shopTypeId": type.id });
    onboardingStore.clearSubmissionKey();
  },
  chooseLocation() {
    wx.chooseLocation({
      success: (location) => {
        this.setData({
          "draft.address": location.address || location.name,
          "draft.longitude": location.longitude,
          "draft.latitude": location.latitude,
        });
        onboardingStore.clearSubmissionKey();
      },
    });
  },
  toggleClosed(event: WechatMiniprogram.SwitchChange) {
    const dayIndex = Number(event.currentTarget.dataset.day);
    const closed = event.detail.value;
    this.setData({
      [`draft.businessHours[${dayIndex}].closed`]: closed,
      [`draft.businessHours[${dayIndex}].periods`]: closed
        ? []
        : [{ open: "09:00", close: "21:00" }],
      [`businessHoursView[${dayIndex}].closed`]: closed,
      [`businessHoursView[${dayIndex}].periods`]: closed
        ? []
        : [{ open: "09:00", close: "21:00" }],
    });
    onboardingStore.clearSubmissionKey();
  },
  changePeriod(event: WechatMiniprogram.PickerChange) {
    const day = Number(event.currentTarget.dataset.day);
    const period = Number(event.currentTarget.dataset.period);
    const field = event.currentTarget.dataset.field as "open" | "close";
    const value = String(event.detail.value);
    this.setData({
      [`draft.businessHours[${day}].periods[${period}].${field}`]: value,
      [`businessHoursView[${day}].periods[${period}].${field}`]: value,
    });
    onboardingStore.clearSubmissionKey();
  },
  addPeriod(event: WechatMiniprogram.TouchEvent) {
    const day = Number(event.currentTarget.dataset.day);
    const draft = this.data.draft;
    if (!draft || draft.businessHours[day]?.periods.length === 3) return;
    const periods = [
      ...(draft.businessHours[day]?.periods ?? []),
      { open: "14:00", close: "18:00" },
    ];
    this.setData({
      [`draft.businessHours[${day}].periods`]: periods,
      [`businessHoursView[${day}].periods`]: periods,
    });
    onboardingStore.clearSubmissionKey();
  },
  removePeriod(event: WechatMiniprogram.TouchEvent) {
    const day = Number(event.currentTarget.dataset.day);
    const period = Number(event.currentTarget.dataset.period);
    const draft = this.data.draft;
    if (!draft || (draft.businessHours[day]?.periods.length ?? 0) <= 1) return;
    const periods = [...(draft.businessHours[day]?.periods ?? [])];
    periods.splice(period, 1);
    this.setData({
      [`draft.businessHours[${day}].periods`]: periods,
      [`businessHoursView[${day}].periods`]: periods,
    });
    onboardingStore.clearSubmissionKey();
  },
  chooseLicense() {
    void this.chooseAndUpload("LICENSE", 1);
  },
  chooseGallery() {
    const remaining = 9 - (this.data.draft?.galleryMedia.length ?? 0);
    if (remaining <= 0) {
      wx.showToast({ title: "经营图片最多九张", icon: "none" });
      return;
    }
    void this.chooseAndUpload("GALLERY", remaining);
  },
  async chooseAndUpload(purpose: "LICENSE" | "GALLERY", count: number) {
    try {
      const chosen = await wx.chooseMedia({
        count,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
      });
      this.setData({ uploading: true });
      for (const file of chosen.tempFiles) {
        const editedPath = await editImageForUpload(file.tempFilePath);
        const uploaded = await uploadBusinessImage(editedPath, purpose);
        if (purpose === "LICENSE") {
          const previous = this.data.draft?.licenseMedia;
          if (previous?.expiresAt) await deleteBusinessImage(previous.id);
          this.setData({ "draft.licenseMedia": uploaded });
        } else {
          const gallery = [...(this.data.draft?.galleryMedia ?? []), uploaded];
          this.setData({ "draft.galleryMedia": gallery });
        }
      }
      onboardingStore.clearSubmissionKey();
    } catch (error) {
      const err = error as { errMsg?: string };
      if (!err.errMsg?.includes("cancel")) {
        wx.showToast({ title: message(error), icon: "none" });
      }
    } finally {
      this.setData({ uploading: false });
    }
  },
  editLicense() {
    const media = this.data.draft?.licenseMedia;
    if (media) void this.editUploadedMedia(media, "LICENSE", -1);
  },
  editGallery(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const media = this.data.draft?.galleryMedia[index];
    if (media) void this.editUploadedMedia(media, "GALLERY", index);
  },
  async editUploadedMedia(
    media: BusinessMedia,
    purpose: "LICENSE" | "GALLERY",
    index: number,
  ) {
    if (this.data.readonly || this.data.uploading) return;
    if (!media.localPath) {
      wx.showToast({ title: "图片尚未加载，请稍后重试", icon: "none" });
      return;
    }
    this.setData({ uploading: true });
    try {
      const editedPath = await editImageForUpload(media.localPath);
      const uploaded = await uploadBusinessImage(editedPath, purpose);
      if (purpose === "LICENSE") {
        this.setData({ "draft.licenseMedia": uploaded });
      } else {
        const gallery = [...(this.data.draft?.galleryMedia ?? [])];
        gallery[index] = uploaded;
        this.setData({ "draft.galleryMedia": gallery });
      }
      onboardingStore.clearSubmissionKey();
      if (media.expiresAt) {
        try {
          await deleteBusinessImage(media.id);
        } catch {
          /* 新图已替换成功，旧临时图交由服务端过期清理。 */
        }
      }
    } catch (error) {
      const err = error as { errMsg?: string };
      if (!err.errMsg?.includes("cancel")) {
        wx.showToast({ title: message(error), icon: "none" });
      }
    } finally {
      this.setData({ uploading: false });
    }
  },
  removeLicense() {
    const media = this.data.draft?.licenseMedia;
    if (media) void this.removeMedia(media, "license", -1);
  },
  removeGallery(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const media = this.data.draft?.galleryMedia[index];
    if (media) void this.removeMedia(media, "gallery", index);
  },
  async removeMedia(
    media: BusinessMedia,
    target: "license" | "gallery",
    index: number,
  ) {
    try {
      if (media.expiresAt) await deleteBusinessImage(media.id);
      if (target === "license") {
        this.setData({ "draft.licenseMedia": null });
      } else {
        const gallery = [...(this.data.draft?.galleryMedia ?? [])];
        gallery.splice(index, 1);
        this.setData({ "draft.galleryMedia": gallery });
      }
      onboardingStore.clearSubmissionKey();
    } catch (error) {
      wx.showToast({ title: message(error), icon: "none" });
    }
  },
  previousStep() {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 });
    }
  },
  nextStep() {
    void this.saveAndContinue();
  },
  async saveAndContinue() {
    const saved = await this.saveDraft();
    if (saved && this.data.currentStep < steps.length - 1) {
      this.setData({ currentStep: this.data.currentStep + 1 });
    }
  },
  saveOnly() {
    void this.saveDraft(true);
  },
  async saveDraft(showSuccess = false): Promise<boolean> {
    const draft = this.data.draft;
    if (!draft || this.data.saving) return false;
    this.setData({ saving: true });
    try {
      const saved = await onboardingStore.save(draft);
      this.setDraftData(saved);
      if (showSuccess) wx.showToast({ title: "草稿已保存", icon: "success" });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const refreshed = await onboardingStore.load();
        this.setDraftData(refreshed);
        wx.showToast({ title: "资料已刷新，请重新确认", icon: "none" });
      } else {
        wx.showToast({ title: message(error), icon: "none" });
      }
      return false;
    } finally {
      this.setData({ saving: false });
    }
  },
  openPreview() {
    if (this.data.readonly) {
      wx.navigateTo({ url: "/pages/onboarding/preview" });
      return;
    }
    void this.saveBeforePreview();
  },
  async saveBeforePreview() {
    const draft = this.data.draft;
    if (!draft || !complete(draft)) {
      wx.showToast({ title: "请先补全全部入驻资料", icon: "none" });
      return;
    }
    if (await this.saveDraft()) {
      wx.navigateTo({ url: "/pages/onboarding/preview" });
    }
  },
});

function complete(value: MerchantApplicationDraft): boolean {
  return Boolean(
    value.shopName.trim() &&
    value.licenseNumber.trim() &&
    value.legalRepresentative.trim() &&
    value.contactName.trim() &&
    /^1[3-9]\d{9}$/.test(value.contactPhone) &&
    value.shopTypeId &&
    value.cityCode &&
    value.district.trim() &&
    value.address.trim() &&
    value.longitude !== undefined &&
    value.latitude !== undefined &&
    value.businessHours.length === 7 &&
    value.licenseMedia &&
    value.settlementAccountName.trim() &&
    value.settlementBankName.trim() &&
    /^\d{4}$/.test(value.settlementAccountSuffix),
  );
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (typeof error === "object" && error && "errMsg" in error) {
    return String((error as { errMsg: string }).errMsg).includes("cancel")
      ? "已取消"
      : "操作失败，请稍后重试";
  }
  return "操作失败，请稍后重试";
}
