import {
  deleteBusinessImage,
  downloadBusinessImage,
} from "../../api/merchant-application";
import { uploadVoucherImage } from "../../api/merchant-voucher";
import { voucherDraftStore } from "../../store/voucher-draft";
import type {
  BusinessMedia,
  BusinessPeriod,
} from "../../types/merchant-application";
import type {
  VoucherDraftForm,
  VoucherPackageItemDraft,
  VoucherValidityType,
} from "../../types/voucher";
import { voucherTypeLabels } from "../../types/voucher";
import { guardVoucherManager } from "../../utils/merchant-guard";
import { ApiError } from "../../utils/request";

const steps = ["基础", "价格", "规则", "图片"];
const dayLabels: Record<string, string> = {
  MONDAY: "周一",
  TUESDAY: "周二",
  WEDNESDAY: "周三",
  THURSDAY: "周四",
  FRIDAY: "周五",
  SATURDAY: "周六",
  SUNDAY: "周日",
};
const validityTypes: VoucherValidityType[] = [
  "DAYS_AFTER_PURCHASE",
  "FIXED_RANGE",
];
const validityNames = ["购买后若干天", "固定日期范围"];
const dateTimeFields = {
  saleBegin: "saleBeginTime",
  saleEnd: "saleEndTime",
  validBegin: "validBeginTime",
  validEnd: "validEndTime",
} as const;
const dateTimeDefaults = {
  saleBegin: "10:00",
  saleEnd: "22:00",
  validBegin: "00:00",
  validEnd: "23:59",
} as const;

type DateTimeTarget = keyof typeof dateTimeFields;
type DateTimeParts = Record<`${DateTimeTarget}${"Date" | "Clock"}`, string>;

Page({
  data: {
    loading: true,
    saving: false,
    uploading: false,
    error: "",
    currentStep: 0,
    steps,
    draft: null as VoucherDraftForm | null,
    productTypeLabel: "",
    productTypeHint: "",
    readonly: false,
    statusLabel: "草稿",
    usageRulesView: [] as Array<Record<string, unknown>>,
    validityNames,
    validityIndex: 0,
    dateTime: emptyDateTimeParts(),
    conflictAvailable: false,
    today: localDate(new Date()),
  },
  async onLoad(options: { id?: string }) {
    const id = options.id?.trim();
    if (!id) {
      this.setData({ loading: false, error: "缺少团购券编号" });
      return;
    }
    if (
      !(await guardVoucherManager({
        route: "/pages/vouchers/editor",
        query: { id },
      }))
    )
      return;
    await this.load(id);
  },
  onShow() {
    const current = voucherDraftStore.formDraft;
    if (current && this.data.draft?.id === current.id) {
      this.setDraftData(cloneForm(current));
    }
  },
  async load(id: string) {
    this.setData({ loading: true, error: "" });
    try {
      const draft = await voucherDraftStore.load(id);
      this.setDraftData(draft);
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
    this.setData({ draft, usageRulesView: usageRulesView(draft) });
  },
  setDraftData(draft: VoucherDraftForm) {
    this.setData({
      draft,
      productTypeLabel: voucherTypeLabels[draft.productType],
      productTypeHint: productTypeHint(draft.productType),
      readonly:
        draft.reviewStatus === "PENDING" || draft.reviewStatus === "APPROVED",
      statusLabel: draft.saleStatusLabel || draft.reviewStatusLabel,
      usageRulesView: usageRulesView(draft),
      validityIndex: Math.max(0, validityTypes.indexOf(draft.validityType)),
      dateTime: dateTimeParts(draft),
    });
  },
  applyChangedDraft(draft: VoucherDraftForm) {
    voucherDraftStore.replaceForm(draft);
    this.setDraftData(draft);
  },
  fieldInput(event: WechatMiniprogram.Input) {
    if (this.data.readonly || !this.data.draft) return;
    const field = String(event.currentTarget.dataset.field);
    const draft = cloneForm(this.data.draft);
    (draft as unknown as Record<string, unknown>)[field] = event.detail.value;
    this.applyChangedDraft(draft);
  },
  switchField(event: WechatMiniprogram.SwitchChange) {
    if (this.data.readonly || !this.data.draft) return;
    const field = String(event.currentTarget.dataset.field);
    const draft = cloneForm(this.data.draft);
    (draft as unknown as Record<string, unknown>)[field] = event.detail.value;
    if (field === "reservationRequired" && !event.detail.value) {
      draft.reservationNotice = "";
    }
    this.applyChangedDraft(draft);
  },
  changeValidity(event: WechatMiniprogram.PickerChange) {
    if (this.data.readonly || !this.data.draft) return;
    const index = Number(event.detail.value);
    const validityType = validityTypes[index];
    if (!validityType) return;
    const draft = cloneForm(this.data.draft);
    draft.validityType = validityType;
    this.applyChangedDraft(draft);
  },
  changeDateTime(event: WechatMiniprogram.PickerChange) {
    if (this.data.readonly || !this.data.draft) return;
    const target = String(event.currentTarget.dataset.target) as DateTimeTarget;
    const part = String(event.currentTarget.dataset.part) as "Date" | "Clock";
    if (!(target in dateTimeFields) || (part !== "Date" && part !== "Clock")) {
      return;
    }
    const dateTime = { ...this.data.dateTime } as DateTimeParts;
    dateTime[`${target}${part}`] = String(event.detail.value);
    const draft = cloneForm(this.data.draft);
    draft[dateTimeFields[target]] = combineDateTime(
      dateTime[`${target}Date`],
      dateTime[`${target}Clock`] || dateTimeDefaults[target],
    );
    this.applyChangedDraft(draft);
  },
  toggleUsageDay(event: WechatMiniprogram.SwitchChange) {
    if (this.data.readonly || !this.data.draft) return;
    const day = Number(event.currentTarget.dataset.day);
    const draft = cloneForm(this.data.draft);
    const rule = draft.usageRules[day];
    if (!rule) return;
    rule.closed = !event.detail.value;
    rule.periods = rule.closed
      ? []
      : rule.periods.length > 0
        ? rule.periods
        : [{ open: "10:00", close: "22:00" }];
    this.applyChangedDraft(draft);
  },
  changeUsagePeriod(event: WechatMiniprogram.PickerChange) {
    if (this.data.readonly || !this.data.draft) return;
    const day = Number(event.currentTarget.dataset.day);
    const periodIndex = Number(event.currentTarget.dataset.period);
    const field = String(
      event.currentTarget.dataset.field,
    ) as keyof BusinessPeriod;
    if (field !== "open" && field !== "close") return;
    const draft = cloneForm(this.data.draft);
    const period = draft.usageRules[day]?.periods[periodIndex];
    if (!period) return;
    period[field] = String(event.detail.value);
    this.applyChangedDraft(draft);
  },
  addUsagePeriod(event: WechatMiniprogram.TouchEvent) {
    if (this.data.readonly || !this.data.draft) return;
    const day = Number(event.currentTarget.dataset.day);
    const draft = cloneForm(this.data.draft);
    const periods = draft.usageRules[day]?.periods;
    if (!periods || periods.length >= 3) return;
    periods.push(nextPeriod(periods));
    this.applyChangedDraft(draft);
  },
  removeUsagePeriod(event: WechatMiniprogram.TouchEvent) {
    if (this.data.readonly || !this.data.draft) return;
    const day = Number(event.currentTarget.dataset.day);
    const period = Number(event.currentTarget.dataset.period);
    const draft = cloneForm(this.data.draft);
    draft.usageRules[day]?.periods.splice(period, 1);
    this.applyChangedDraft(draft);
  },
  addExcludedDate(event: WechatMiniprogram.PickerChange) {
    if (this.data.readonly || !this.data.draft) return;
    const value = String(event.detail.value);
    const draft = cloneForm(this.data.draft);
    if (!draft.excludedDates.includes(value)) {
      draft.excludedDates.push(value);
      draft.excludedDates.sort();
      this.applyChangedDraft(draft);
    }
  },
  removeExcludedDate(event: WechatMiniprogram.TouchEvent) {
    if (this.data.readonly || !this.data.draft) return;
    const index = Number(event.currentTarget.dataset.index);
    const draft = cloneForm(this.data.draft);
    draft.excludedDates.splice(index, 1);
    this.applyChangedDraft(draft);
  },
  addPackageItem() {
    if (this.data.readonly || !this.data.draft) return;
    if (this.data.draft.packageItems.length >= 50) {
      wx.showToast({ title: "最多添加五十条明细", icon: "none" });
      return;
    }
    const draft = cloneForm(this.data.draft);
    draft.packageItems.push({
      name: "",
      quantity: "1",
      unit: draft.productType === "MULTI_USE" ? "次" : "份",
      unitPriceYuan: "",
    });
    this.applyChangedDraft(draft);
  },
  packageItemInput(event: WechatMiniprogram.Input) {
    if (this.data.readonly || !this.data.draft) return;
    const index = Number(event.currentTarget.dataset.index);
    const field = String(
      event.currentTarget.dataset.field,
    ) as keyof VoucherPackageItemDraft;
    if (
      !(["name", "quantity", "unit", "unitPriceYuan"] as string[]).includes(
        field,
      )
    ) {
      return;
    }
    const draft = cloneForm(this.data.draft);
    const item = draft.packageItems[index];
    if (!item) return;
    item[field] = event.detail.value;
    this.applyChangedDraft(draft);
  },
  removePackageItem(event: WechatMiniprogram.TouchEvent) {
    if (this.data.readonly || !this.data.draft) return;
    const index = Number(event.currentTarget.dataset.index);
    const draft = cloneForm(this.data.draft);
    draft.packageItems.splice(index, 1);
    this.applyChangedDraft(draft);
  },
  chooseCover() {
    if (!this.data.readonly) void this.chooseAndUpload("VOUCHER_COVER", 1);
  },
  chooseDetails() {
    if (this.data.readonly) return;
    const remaining = 9 - (this.data.draft?.detailMedia.length ?? 0);
    if (remaining <= 0) {
      wx.showToast({ title: "详情图最多九张", icon: "none" });
      return;
    }
    void this.chooseAndUpload("VOUCHER_DETAIL", remaining);
  },
  async chooseAndUpload(
    purpose: "VOUCHER_COVER" | "VOUCHER_DETAIL",
    count: number,
  ) {
    if (!this.data.draft || this.data.uploading) return;
    try {
      const chosen = await wx.chooseMedia({
        count,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"],
      });
      this.setData({ uploading: true });
      const draft = cloneForm(this.data.draft);
      for (const file of chosen.tempFiles) {
        const uploaded = await uploadVoucherImage(file.tempFilePath, purpose);
        if (purpose === "VOUCHER_COVER") {
          const previous = draft.coverMedia;
          if (previous?.expiresAt) await deleteBusinessImage(previous.id);
          draft.coverMedia = uploaded;
        } else {
          draft.detailMedia.push(uploaded);
        }
      }
      this.applyChangedDraft(draft);
    } catch (error) {
      if (!isCanceled(error)) {
        wx.showToast({ title: message(error), icon: "none" });
      }
    } finally {
      this.setData({ uploading: false });
    }
  },
  removeCover() {
    const media = this.data.draft?.coverMedia;
    if (media && !this.data.readonly) void this.removeMedia(media, -1);
  },
  removeDetail(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    const media = this.data.draft?.detailMedia[index];
    if (media && !this.data.readonly) void this.removeMedia(media, index);
  },
  async removeMedia(media: BusinessMedia, detailIndex: number) {
    if (!this.data.draft) return;
    try {
      if (media.expiresAt) await deleteBusinessImage(media.id);
      const draft = cloneForm(this.data.draft);
      if (detailIndex < 0) delete draft.coverMedia;
      else draft.detailMedia.splice(detailIndex, 1);
      this.applyChangedDraft(draft);
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
    if (this.data.readonly) {
      if (this.data.currentStep < steps.length - 1) {
        this.setData({ currentStep: this.data.currentStep + 1 });
      }
      return;
    }
    void this.saveAndContinue();
  },
  async saveAndContinue() {
    if (await this.saveDraft()) {
      this.setData({
        currentStep: Math.min(steps.length - 1, this.data.currentStep + 1),
      });
    }
  },
  saveOnly() {
    void this.saveDraft(true);
  },
  async saveDraft(showSuccess = false): Promise<boolean> {
    const draft = this.data.draft;
    if (!draft || this.data.saving || this.data.readonly) return false;
    this.setData({ saving: true, error: "" });
    try {
      const previous = cloneForm(draft);
      const saved = await voucherDraftStore.save(draft);
      mergeLocalPaths(saved, previous);
      this.setDraftData(saved);
      this.setData({ conflictAvailable: false });
      if (showSuccess) wx.showToast({ title: "草稿已保存", icon: "success" });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const latest = voucherDraftStore.formDraft;
        if (latest) {
          this.setDraftData(cloneForm(latest));
          await this.loadPrivatePreviews(cloneForm(latest));
        }
        this.setData({
          conflictAvailable: Boolean(voucherDraftStore.conflictDraft),
          error: "检测到更新版本，已保留本次填写内容。",
        });
      } else {
        this.setData({ error: message(error) });
      }
      return false;
    } finally {
      this.setData({ saving: false });
    }
  },
  reapplyConflict() {
    const draft = voucherDraftStore.reapplyConflict();
    if (!draft) return;
    this.setDraftData(draft);
    this.setData({ conflictAvailable: false, error: "" });
    wx.showToast({ title: "已恢复本次填写", icon: "success" });
  },
  openPreview() {
    if (!this.data.draft) return;
    if (this.data.readonly) {
      wx.navigateTo({
        url: `/pages/vouchers/preview?id=${this.data.draft.id}`,
      });
      return;
    }
    void this.saveBeforePreview();
  },
  async saveBeforePreview() {
    if (await this.saveDraft()) {
      wx.navigateTo({
        url: `/pages/vouchers/preview?id=${this.data.draft?.id}`,
      });
    }
  },
});

function usageRulesView(draft: VoucherDraftForm) {
  return draft.usageRules.map((rule) => ({
    ...rule,
    label: dayLabels[rule.dayOfWeek],
  }));
}

function productTypeHint(type: VoucherDraftForm["productType"]): string {
  if (type === "PACKAGE") return "组合商品或服务，按套餐内容一次使用";
  if (type === "CASH") return "满足消费门槛后抵扣固定金额";
  if (type === "DISCOUNT") return "满足消费门槛后按折扣结算";
  return "按约定次数分次使用服务";
}

function emptyDateTimeParts(): DateTimeParts {
  return {
    saleBeginDate: "",
    saleBeginClock: dateTimeDefaults.saleBegin,
    saleEndDate: "",
    saleEndClock: dateTimeDefaults.saleEnd,
    validBeginDate: "",
    validBeginClock: dateTimeDefaults.validBegin,
    validEndDate: "",
    validEndClock: dateTimeDefaults.validEnd,
  };
}

function dateTimeParts(draft: VoucherDraftForm): DateTimeParts {
  const result = emptyDateTimeParts();
  (Object.keys(dateTimeFields) as DateTimeTarget[]).forEach((target) => {
    const [date, clock] = splitDateTime(draft[dateTimeFields[target]]);
    result[`${target}Date`] = date;
    result[`${target}Clock`] = clock || dateTimeDefaults[target];
  });
  return result;
}

function splitDateTime(value: string): [string, string] {
  if (!value) return ["", ""];
  const [date = "", rawClock = ""] = value.split("T");
  return [date, rawClock.slice(0, 5)];
}

function combineDateTime(date: string, clock: string): string {
  return date ? `${date}T${clock}:00` : "";
}

function nextPeriod(periods: BusinessPeriod[]): BusinessPeriod;
function nextPeriod(periods: BusinessPeriod[]): BusinessPeriod {
  const previous = periods[periods.length - 1];
  const open =
    previous?.close && previous.close < "23:00" ? previous.close : "08:00";
  return { open, close: addHour(open) };
}

function addHour(value: string): string {
  const hour = Math.min(23, Number(value.slice(0, 2)) + 1);
  return `${String(hour).padStart(2, "0")}:${value.slice(3, 5) || "00"}`;
}

function mergeLocalPaths(
  target: VoucherDraftForm,
  source: VoucherDraftForm,
): void {
  const paths = new Map<string, string>();
  [source.coverMedia, ...source.detailMedia].forEach((media) => {
    if (media?.localPath) paths.set(media.id, media.localPath);
  });
  [target.coverMedia, ...target.detailMedia].forEach((media) => {
    if (media) media.localPath = paths.get(media.id) || media.localPath;
  });
}

function cloneForm(value: VoucherDraftForm): VoucherDraftForm {
  return JSON.parse(JSON.stringify(value)) as VoucherDraftForm;
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCanceled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
    error &&
    "errMsg" in error &&
    String((error as { errMsg: string }).errMsg).includes("cancel"),
  );
}

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return isCanceled(error) ? "已取消" : "操作失败，请稍后重试";
}
