import { downloadBusinessImage } from "../../api/merchant-application";
import { merchantStore } from "../../store/merchant";
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

Page({
  data: {
    draft: null as MerchantApplicationDraft | null,
    hours: [] as Array<Record<string, unknown>>,
    shopTypeName: "未选择",
    cityName: "未选择",
    statusLabel: "草稿",
    submittedAt: "",
    canSubmit: false,
    submitting: false,
    error: "",
  },
  onLoad() {
    const draft = cloneDraft(onboardingStore.draft);
    const application = onboardingStore.application;
    this.setData({
      draft,
      hours: draft.businessHours.map((day) => ({
        ...day,
        label: businessDayLabels[day.dayOfWeek],
      })),
      shopTypeName:
        onboardingStore.shopTypes.find((type) => type.id === draft.shopTypeId)
          ?.name ?? "未选择",
      cityName:
        onboardingStore.cities.find((city) => city.code === draft.cityCode)
          ?.name ?? "未选择",
      statusLabel: application?.statusLabel ?? "草稿",
      submittedAt: application?.submittedAt ?? "",
      canSubmit: application?.status === "DRAFT",
    });
    void this.loadPrivatePreviews(draft);
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
    this.setData({ draft });
  },
  goBack() {
    wx.navigateBack();
  },
  async submit() {
    if (this.data.submitting || !this.data.canSubmit) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: "确认提交审核",
        content: "提交后资料将锁定，审核完成前不能修改。",
        confirmText: "确认提交",
        confirmColor: "#ff5f57",
        success: (result) => resolve(result.confirm),
        fail: () => resolve(false),
      });
    });
    if (!confirmed) return;
    this.setData({ submitting: true, error: "" });
    try {
      const application = await onboardingStore.submit();
      await merchantStore.restore(true);
      this.setData({
        statusLabel: application.statusLabel,
        submittedAt: application.submittedAt ?? "",
        canSubmit: false,
      });
      wx.showToast({ title: "申请已提交", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/me/index" }), 500);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        await onboardingStore.load();
        this.setData({ error: "申请状态已变化，请返回后重新查看" });
      } else {
        this.setData({
          error:
            error instanceof ApiError ? error.message : "提交失败，请稍后重试",
        });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },
});
